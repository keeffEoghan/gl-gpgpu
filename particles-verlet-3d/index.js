/**
 * Test implementation of 3D particle Verlet-integration simulation.
 */
import getRegl from 'regl';
import timer from '@epok.tech/fn-time';
import { count, vertices } from '@epok.tech/gl-screen-triangle';

import { gpgpu, extensions, optionalExtensions } from '../';
import { macroValues } from '../macros';
import { getUniforms, countDrawIndexes, getDrawIndexes } from '../inputs';

import stepVert from '@epok.tech/gl-screen-triangle/uv-texture.vert.glsl';

import stepFrag from './step.frag.glsl';

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
    life: [valuesKeys.indexOf('life')],
    acceleration: [
        valuesKeys.indexOf('acceleration'), valuesKeys.indexOf('life')
    ]
};

const values = Object.values(valuesMap);
const derives = Object.values(derivesMap);

const state = gpgpu(regl, {
    scale: 6,
    maps: { values: [...values], derives: [...derives] },
    step: {
        vert: stepVert, frag: stepFrag,
        verts: [], frags: [],
        uniforms: {
            dt: regl.prop('step.timer.dt'),
            time: regl.prop('step.timer.time'),
            lifetime: [5e3, 1e4]
        }
    },
    // 1 active state + 2 past states needed for Verlet integration.
    steps: 1+2
});

state.step.timer = { step: '-', time: regl.now() };
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
    Math.max(1, (state.steps.length-1)*2);

const drawIndexes = getDrawIndexes(drawCount);

const drawCommand = {
    vert: macroValues(state)+'\n'+drawVert,
    frag: drawFrag,
    attributes: { index: drawIndexes },
    uniforms: getUniforms({ ...state, bound: 0 },
        { ...state.step.uniforms, pointSize: 1 }),
    count: drawCount,
    primitive: ((state.steps.length > 1)? 'lines' : 'points')
};

console.log(self.drawCommand = drawCommand);

const draw = regl(drawCommand);

// const clear = { color: [0, 0, 0, 255] };

// setTimeout(() => {
regl.frame(() => {
    // regl.clear(clear);
    timer(state.step.timer, regl.now());
    state.step.run();
    draw(state);
});
// }, 1000);

// export function getParticlesVerlet3DSetup(regl, s, o) {
//     const out = getSetup(regl, state, o);

//     const extra = out.particlesVerlet3D = { lifetime: [0.5, 1] };
//     // const extra = out.particlesVerlet3D = { lifetime: [100, 256] };

//     const stepUniforms = out.stepUniforms = getUniforms(regl, out);
//     const drawUniforms = out.drawUniforms = getUniforms(regl, out);

//     stepUniforms.lifetime = drawUniforms.lifetime =
//         (c, { particlesVerlet3D: { lifetime: l } }) => l;

//     return out;
// }

// export default getParticlesVerlet3DSetup;
