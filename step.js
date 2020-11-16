/**
 * GPGPU ping-pong buffers, update step.
 */

import { each, wrapGet } from '@epok.tech/array-utils';
import { positions as positionsDef } from '@epok.tech/gl-screen-triangle';

import vertDef from '@epok.tech/gl-screen-triangle/index.vert.glsl';

import { macroPass } from './macros';
import { getUniforms } from './inputs.js';

const vec2 = 0.5;

/**
 * Creates a GPGPU update step function, for use with a GPGPU state object.
 *
 * @todo Optional transform feedback instead of GPGPU textures, where available
 *     (needs vertex draw, instead of texture draw).
 * @todo Optional multi-buffer-rendering, where available.
 * @todo Make this fully extensible in state.
 *
 * @see [getState]{@link ./state.js#getState}
 * @see [macroPass]{@link ./macros.js#macroPass}
 * @see [getUniforms]{@link ./inputs.js#getUniforms}
 *
 * @export
 * @param {object} api The API to set up WebGL resources.
 * @param {object} state An initial object of GPGPU state data and resources.
 *     See `getState`.
 *
 * @returns A GPGPU update step function, to be passed a GPGPU state to update.
 */
export function getStep(api, state, out = {}) {
    const { now, buffer, draw, gl = api } = api;

    const {
            stepVert = vertDef,
            stepFrag,
            stepPositions: positions = positionsDef,
            stepUniforms: uniforms = getUniforms(api, state),
            groups: { passes }
        } = state;

    // Set up the shaders needed for all the passes.
    const stepVerts = out.stepVerts = [];
    const stepFrags = out.stepFrags = [];
    const passState = { ...state };

    each((pass, p) => {
            passState.pass = p;

            const passMacros = macroPass(passState);

            stepVerts[p] = passMacros+stepVert;
            stepFrags[p] = passMacros+stepFrag;
        },
        passes);

    const stepPositions = out.stepPositions = buffer(positions);

    out.stepUniforms = uniforms;

    // Uses the full-screen vertex shader state by default.
    out.doPass = gl(out.stepCommand = {
        vert: (c, { stepVert: v, stepVerts: vs, pass: p }) => (vs[p] || v),
        frag: (c, { stepFrag: f, stepFrags: fs, pass: p }) => (fs[p] || f),
        // vert: (c, props) => macroPass(props)+(props.stepVert || vertDef),
        // frag: (c, props) => macroPass(props)+props.stepFrag,
        attributes: {
            position: (c, { stepPositions: p = stepPositions }) => p
        },
        uniforms,
        count: (c, { stepCount: count = positions.length*vec2 }) => count,
        depth: { enable: false },
        framebuffer: (c, { steps, step, pass }) => wrapGet(step, steps)[pass]
    });

    const cache = {
        props: null
    };

    out.doStep = (props) => {
        props.step++;

        const { doPass, onPass, groups: { passes } } = props;
        const callPass = ((onPass)? () => doPass(onPass(props)) : () => doPass(props));

        each((pass, p) => {
                props.pass = p;
                callPass();
            },
            passes);

        return props;
    };

    return out;
}

export default getStep;
