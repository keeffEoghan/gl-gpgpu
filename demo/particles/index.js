/**
 * Demo implementation of 3D particle Verlet/Euler integration simulation.
 */

import getRegl from 'regl';
import clamp from 'clamp';
import timer from '@epok.tech/fn-time';
import reduce from '@epok.tech/fn-lists/reduce';
import map from '@epok.tech/fn-lists/map';

import { gpgpu, extensionsFloat, optionalExtensions } from '../../index';
import { macroValues } from '../../macros';
import { getUniforms, countDrawIndexes, getDrawIndexes } from '../../inputs';
import indexPairs from '../../index-pairs';

import stepVert from '@epok.tech/gl-screen-triangle/uv-texture.vert.glsl';

import stepFrag from './step.frag.glsl';

import drawVert from './draw.vert.glsl';
import drawFrag from './draw.frag.glsl';

const reglProps = {
    pixelRatio: Math.max(Math.floor(devicePixelRatio), 1.5),
    extensions: extensionsFloat(), optionalExtensions: optionalExtensions()
};

const regl = self.regl = getRegl(reglProps);

console.log('extensions',
    reduce((o, e) => o+((o)? '; ' : '')+e+': '+regl.hasExtension(e),
        reglProps.extensions, ''));

console.log('optionalExtensions',
    reduce((o, e) => o+((o)? '; ' : '')+e+': '+regl.hasExtension(e),
        reglProps.optionalExtensions, ''));

const canvas = document.querySelector('canvas');

canvas.classList.add('view');

// How many frame-buffers are bound at a given time.
const bound = 1;
// How many values/channels each property independently tracks.
const valuesMap = { position: 3, life: 1, acceleration: 3 };
const values = Object.values(valuesMap);

// Limits of this device and these `values`.
const { maxTextureUnits, maxTextureSize } = regl.limits;

const limits = {
    steps: [
        1+bound,
        Math.floor(maxTextureUnits*4/reduce((s, v) => s+v, values, 0))
    ],
    // Better stay farther under maximum texture size, or errors/crashes.
    scale: [1, Math.log2(maxTextureSize)]
};

console.log('limits', limits, regl.limits);

// Handle query parameters.
const query = new URLSearchParams(location.search);

// 1 active state, as many others as can be bound; at least 2 past states needed
// for Verlet integration, 1 for Euler integration.
const steps = Math.floor(clamp((parseInt(query.get('steps'), 10) || 2+bound),
    ...limits.steps));

pastSteps = steps-bound;

const scale = Math.floor(clamp((parseInt(query.get('scale'), 10) || 8),
    ...limits.scale));

// Fixed time-step if given; otherwise uses look-behind delta-time.
const hasTimestep = query.has('timestep');
const timestepDef = 1e3/60;

const timestep = (hasTimestep &&
    (parseFloat(query.get('timestep'), 10) || timestepDef));

console.log(location.search+':\n', ...([...query.entries()].flat()), '\n',
    'steps:', steps, 'scale:', scale, 'timestep:', timestep);

// Set up the links.

document.querySelector('#points').href = `?steps=2&scale=${
    Math.max(limits.scale[1]-5, 9)}${
    ((hasTimestep)? '&timestep='+query.get('timestep') : '')}#points`;

document.querySelector('#max').href = `?steps=${Math.max(limits.steps[1]-3, 1)
    }&scale=${Math.max(limits.scale[1]-5, 9)}${
    ((hasTimestep)? '&timestep='+query.get('timestep') : '')}#max`;

// Override `query` here for convenience - not reused later.
((timestep)? query.delete('timestep') : query.set('timestep', timestepDef));
document.querySelector('#time').href = `?${query}#time`;

// How values/channels map to their derivations.

const valuesKeys = Object.keys(valuesMap);

const derivesMap = {
    position: [
        // Position, 2 steps past.
        [Math.min(1, pastSteps-1), valuesKeys.indexOf('position')],
        // Position, 1 step past.
        valuesKeys.indexOf('position'),
        valuesKeys.indexOf('acceleration'),
        valuesKeys.indexOf('life')
    ],
    life: [
        // Life, oldest step.
        [Math.max(pastSteps-1, 0), valuesKeys.indexOf('life')],
        // Life, 1 step past.
        valuesKeys.indexOf('life')
    ],
    acceleration: [
        valuesKeys.indexOf('acceleration'), valuesKeys.indexOf('life')
    ]
};

const derives = Object.values(derivesMap);

// Whether to allow Verlet integration.
const canVerlet = (pastSteps >= 2);

const cache = { source: [] };

// The main GPGPU state.
const state = gpgpu(regl, {
    props: {
        // Set up the timer.
        timer: timer((timestep)?
                // Fixed-step, look-ahead add-time.
                { step: timestep }
                // Real-time, look-behind delta-time.
            :   { step: '-', now: () => regl.now()*1e3 }),
        // Speed up or slow down the passage of time.
        rate: 1,
        // Loop time over this period to avoid instability of parts of the demo.
        loop: 3e3,
        // Whether to use Verlet (midpoint) or Euler (forward) integration.
        useVerlet: canVerlet,
        // Range of how long a particle lives before respawning.
        lifetime: [5e2, 3e3],
        // Acceleration due to gravity.
        g: [0, -9.80665, 0],
        // The position particles respawn from.
        source: [0, 0, 0.5],
        // To help accuracy of very small numbers, pass force as `[x, y] = xEy`.
        // One of these options chosen depending on integration used.
        force: [
            // Euler.
            [1, -4],
            // Verlet.
            [1, -7]
        ],
        // To help with accuracy of small numbers, uniformly scale the drawing.
        scale: 1e-3
    },
    bound, steps, scale,
    maps: { values: [...values], derives: [...derives] },
    step: {
        vert: stepVert, frag: stepFrag,
        verts: [], frags: [],
        uniforms: {
            dt: (_, { props: { timer: { dt }, rate } }) => dt*rate,
            time: (_, { props: { timer: { time }, rate } }) => time*rate,
            loop: (_, { props: { timer: { time }, loop } }) =>
                Math.sin(time/loop*Math.PI)*loop,

            lifetime: regl.prop('props.lifetime'),
            g: regl.prop('props.g'),

            source: (_, { props: { source, scale } }) =>
                map((v, i) => v/scale, source, cache.source),

            force: (_, { props: { useVerlet: u, force: f } }) => f[+u],
            useVerlet: (_, { props: { useVerlet: u } }) => +u
        }
    }
});

console.log(self.state = state);

// Set up rendering.
// @todo Why doesn't `state.steps.length-state.bound` seem to make a difference?
const drawCount = countDrawIndexes(state.size)*indexPairs(state.steps.length);
const drawIndexes = getDrawIndexes(drawCount);
const drawState = { ...state };

const drawCommand = {
    vert: macroValues(drawState)+'\n'+drawVert,
    frag: drawFrag,
    attributes: { index: drawIndexes },
    uniforms: getUniforms(drawState, {
        ...drawState.step.uniforms,
        scale: regl.prop('props.scale'), pointSize: 2**3
    }),
    lineWidth: 1,
    count: drawCount,
    depth: { enable: true },
    blend: { enable: true, func: { src: 'one', dst: 'one minus src alpha' } },
    primitive: ((drawState.steps.length > 2)? 'lines' : 'points')
};

console.log((self.drawCommand = drawCommand), drawCount);

const draw = regl(drawCommand);

const clearView = { color: [0, 0, 0, 0], depth: 1 };

regl.frame(() => {
    timer(state.props.timer);
    state.step.run();
    drawState.stepNow = state.stepNow;
    regl.clear(clearView);
    draw(drawState);
});

// Toggle Verlet integration, if there are enough past steps.
canvas.addEventListener('click', () =>
    console.log('useVerlet',
        (state.props.useVerlet = (canVerlet && !state.props.useVerlet))));

canvas.addEventListener('touchmove', (e) => {
    e.stopPropagation();
    e.preventDefault();
});

canvas.addEventListener((('onpointermove' in self)? 'pointermove'
        :   (('ontouchmove' in self)? 'touchmove' : 'mousemove')),
    (e) => {
        const { clientX: x, clientY: y } = e;
        const { source } = state.props;
        const size = Math.min(innerWidth, innerHeight);

        source[0] = ((((x-((innerWidth-size)*0.5))/size)*2)-1);
        source[1] = -((((y-((innerHeight-size)*0.5))/size)*2)-1);

        e.stopPropagation();
        e.preventDefault();
    });

module?.hot?.accept?.(() => location.reload());
