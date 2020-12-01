/**
 * Test implementation of 3D particle Verlet-integration simulation.
 */
import getRegl from 'regl';
import timer from '@epok.tech/fn-time';
import { count, vertices } from '@epok.tech/gl-screen-triangle';
import wrap from '@epok.tech/fn-lists/wrap-index';

import { gpgpu, extensions, optionalExtensions } from '../';
import { macroValues } from '../macros';
import { getUniforms, countDrawIndexes, getDrawIndexes } from '../inputs';

import stepVert from '@epok.tech/gl-screen-triangle/uv-texture.vert.glsl';

import stepFrag from './step.frag.glsl';

import fboFrag from './fbo.frag.glsl';

import drawVert from './draw.vert.glsl';
import drawFrag from './draw.frag.glsl';

const regl = getRegl({
    extensions: extensions(), optionalExtensions: optionalExtensions()
});

// How many values/channels each property independently tracks.
const valuesMap = { position: 3, life: 1, acceleration: 3 };
const valuesKeys = Object.keys(valuesMap);
const derivesMap = {
    position: [
        // Position, 1 step past.
        valuesKeys.indexOf('position'),
        // Position, 2 steps past.
        [1, valuesKeys.indexOf('position')],
        valuesKeys.indexOf('acceleration'),
        valuesKeys.indexOf('life')
    ],
    life: [valuesKeys.indexOf('life'), [1, valuesKeys.indexOf('life')]],
    // life: [valuesKeys.indexOf('life')],
    acceleration: [
        valuesKeys.indexOf('acceleration'), valuesKeys.indexOf('life')
    ]
};

const values = Object.values(valuesMap);
const derives = Object.values(derivesMap);

const state = gpgpu(regl, {
    useVerlet: true,
    scale: 10,
    maps: { values: [...values], derives: [...derives] },
    step: {
        vert: stepVert, frag: stepFrag,
        verts: [], frags: [],
        uniforms: {
            dt: regl.prop('step.timer.dt'),
            time: regl.prop('step.timer.time'),
            lifetime: [1e3, 2e3],
            force: (_, { useVerlet: v }) => ((v)? 1e-3 : 1),
            useVerlet: (_, { useVerlet: v }) => +v
        }
    },
    bound: 1,
    // 1 active state + 2 past states needed for Verlet integration.
    steps: 1+2
});

state.step.timer = { step: '-', time: regl.now()*1e3 };
timer(state.step.timer, state.step.timer.time);

console.log(self.state = state);

/**
 * Draw pairs of vertexes for lines between each particle's current and past
 * positions using `gl.LINES`.
 * @see `gl.LINES` at https://webglfundamentals.org/webgl/lessons/webgl-points-lines-triangles.html
 *
 * If fewer than 2 states are given, lines can't be drawn, so uses `gl.POINTS`.
 */
const drawCount = countDrawIndexes(state.size)*
    Math.max(1, (state.steps.length-state.bound-1)*2);

const drawIndexes = getDrawIndexes(drawCount);

const drawCommand = {
    vert: macroValues(state)+'\n'+drawVert,
    frag: drawFrag,
    attributes: { index: drawIndexes },
    // uniforms: getUniforms({ ...state, bound: 0 },
    uniforms: getUniforms(state,
        { ...state.step.uniforms, pointSize: 5 }),
    lineWidth: 1,
    count: drawCount,
    primitive: ((state.steps.length > 2)? 'lines' : 'points')
};

console.log(self.drawCommand = drawCommand);

const draw = regl(drawCommand);

regl.frame(() => {
    timer(state.step.timer, regl.now()*1e3);
    state.step.run();
    draw(state);
});

self.addEventListener('click',
    () => console.log('useVerlet', (state.useVerlet = !state.useVerlet)));
