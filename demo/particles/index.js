/**
 * Test implementation of 3D particle Verlet-integration simulation.
 */
import getRegl from 'regl';
import querystring from 'querystring';
import timer from '@epok.tech/fn-time';
import reduce from '@epok.tech/fn-lists/reduce';

import { gpgpu, extensionsFloat, optionalExtensions } from '../../index';
import { macroValues } from '../../macros';
import { getUniforms, countDrawIndexes, getDrawIndexes } from '../../inputs';
import indexPairs from '../../index-pairs';

import stepVert from '@epok.tech/gl-screen-triangle/uv-texture.vert.glsl';

import stepFrag from './step.frag.glsl';

import drawVert from './draw.vert.glsl';
import drawFrag from './draw.frag.glsl';

const search = document.location.search.slice(1);
const query = querystring.parse(search);

const bound = 1;
// 1 active state, 2 past states needed for Verlet integration, plus as many
// others as can be bound.
const steps = bound+(parseInt(query.steps, 10) || 2);
const scale = Math.floor((parseInt(query.scale, 10) || 9)-(Math.sqrt(steps)/2));

// Fixed timestep if given; otherwise uses look-behind delta-time.
const timestep = (query.timestep && (parseFloat(query.timestep, 10) || 1e3/60));

console.log(search+':', query,
    'steps:', steps, 'scale:', scale, 'timestep:', timestep);

const reglProps = {
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

// How many values/channels each property independently tracks.
const valuesMap = { position: 3, life: 1, acceleration: 3 };
const valuesKeys = Object.keys(valuesMap);
const derivesMap = {
    position: [
        // Position, 2 steps past.
        [Math.min(steps-1-bound, 1), valuesKeys.indexOf('position')],
        // Position, 1 step past.
        valuesKeys.indexOf('position'),
        valuesKeys.indexOf('acceleration'),
        valuesKeys.indexOf('life')
    ],
    life: [
        // Life, oldest step.
        [Math.max(0, steps-1-bound), valuesKeys.indexOf('life')],
        // Life, 1 step past.
        valuesKeys.indexOf('life')
    ],
    acceleration: [
        valuesKeys.indexOf('acceleration'), valuesKeys.indexOf('life')
    ]
};

const values = Object.values(valuesMap);
const derives = Object.values(derivesMap);

const canVerlet = (steps, bound) => steps-bound >= 2;

const state = gpgpu(regl, {
    props: {
        timer: ((timestep)?
                // Fixed-step, look-ahead add-time.
                { step: '+', time: 0, step: timestep }
                // Real-time, look-behind delta-time.
            :   { step: '-', time: regl.now()*1e3 }),
        // Speed up or slow down the passage of time.
        rate: 1,
        // Loop time over this period to avoid instability of parts of the demo.
        loop: 3e3,
        // Whether to use Verlet (midpoint) or Euler (forward) integration.
        useVerlet: true,
        // Range of how long a particle lives before respawning.
        lifetime: [1e3, 5e3],
        // Acceleration due to gravity.
        g: [0, -9.80665, 0],
        // The position particles respawn from.
        source: [0, 0, 0],
        // To help accuracy of very small numbers, pass force as `[x, y] = xEy`.
        // One of these options chosen depending on integration used.
        force: [
            // Euler.
            [1, -4],
            // Verlet.
            [1, -7]
        ],
        // To help with accuracy of small numbers, uniformly scale the drawing.
        // scale: 1
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
            source: regl.prop('props.source'),
            scale: regl.prop('props.scale'),

            force: (_, { steps: s, bound: b, props: { useVerlet, force } }) =>
                force[+(useVerlet && canVerlet(s.length, b))],

            useVerlet: (_, { steps: s, bound: b, props: { useVerlet } }) =>
                +(useVerlet && canVerlet(s.length, b))
        }
    }
});

timer(state.props.timer, state.props.timer.time);

console.log(self.state = state);

const drawCount = countDrawIndexes(state.size)*
    // @todo Why does `bound` not seem to make much difference?
    // indexPairs(state.steps.length-state.bound);
    indexPairs(state.steps.length);

const drawIndexes = getDrawIndexes(drawCount);
const drawState = { ...state };

const drawCommand = {
    vert: macroValues(drawState)+'\n'+drawVert,
    frag: drawFrag,
    attributes: { index: drawIndexes },
    uniforms: getUniforms(drawState,
        { ...drawState.step.uniforms, pointSize: 4 }),
    lineWidth: 1,
    count: drawCount,
    primitive: ((drawState.steps.length > 2)? 'lines' : 'points')
};

console.log((self.drawCommand = drawCommand), drawCount);

const draw = regl(drawCommand);

const stepTimer = ((timestep)?
        // Fixed-step.
        () => timer(state.props.timer, state.props.timer.step)
        // Real-time.
    :   () => timer(state.props.timer, regl.now()*1e3));

regl.frame(() => {
    stepTimer();
    state.step.run();
    drawState.stepNow = state.stepNow;
    draw(drawState);
});

self.addEventListener('click', () =>
    console.log('useVerlet',
        (state.props.useVerlet = (canVerlet(state.steps.length, state.bound) &&
            !state.props.useVerlet))));

canvas.addEventListener('touchmove', (e) => {
    e.stopPropagation();
    e.preventDefault();
});

canvas.addEventListener((('onpointermove' in self)? 'pointermove'
        :   (('ontouchmove' in self)? 'touchmove' : 'mousemove')),
    (e) => {
        const { clientX: x, clientY: y } = e;
        const { source, scale } = state.props;
        const size = Math.min(innerWidth, innerHeight);

        source[0] = ((((x-((innerWidth-size)*0.5))/size)*2)-1)/scale;
        source[1] = -((((y-((innerHeight-size)*0.5))/size)*2)-1)/scale;

        e.stopPropagation();
        e.preventDefault();
    });

module?.hot?.accept?.(() => location.reload());
