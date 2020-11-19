/**
 * GPGPU ping-pong buffers, update step.
 */

import { each, wrapGet } from '@epok.tech/array-utils';
import { positions as positionsDef } from '@epok.tech/gl-screen-triangle';
// @ts-ignore
import vertDef from '@epok.tech/gl-screen-triangle/index.vert.glsl';

import { macroPass } from './macros';
import { getUniforms } from './inputs.js';

const scale = { vec2: 0.5 };

/**
 * Creates a GPGPU update step function, for use with a GPGPU state object.
 *
 * @todo Optional transform feedback instead of GPGPU textures, where available
 *     (needs vertex draw, instead of texture draw).
 * @todo Make this fully extensible in state.
 *
 * @see [getState]{@link ./state.js#getState}
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [macroPass]{@link ./macros.js#macroPass}
 * @see [getUniforms]{@link ./inputs.js#getUniforms}
 *
 * @export
 * @param {object} api An API of GL resources.
 * @param {function} api.buffer A function to set up a GL buffer.
 * @param {function} api.command A function to call a GL draw, with all options.
 * @param {object} state The GPGPU state to use. See `getState` and `mapGroups`.
 * @param {object} state.step The properties for the step GL command.
 * @param {string} [state.step.vert=vertDef] The step vertex shader GLSL; a
 *     simple flat screen shader if not given.
 * @param {string} state.step.frag The step fragment shader GLSL.
 * @param {object} [state.step.uniforms=getUniforms(state)] The step uniforms;
 *     set up if not given. See `getUniforms`.
 * @param {array|api.buffer} [state.step.positions=positionsDef] The step
 *     position attributes; 3 points of a large flat triangle if not given.
 * @param {number} [state.step.count=state.step.positions.length*scale.vec2] The
 *     number of elements/attributes to draw.
 * @param {boolean} [cacheGLSL] Whether to preprocess and cache shader code, or
 *     process it just-in-time before each frame.
 * @param {object} [out={}] The results object; a new object if not given.
 *
 * @returns {object} `out` The given `out` object; containing a GPGPU update
 *     step function and related properties, to be passed a GPGPU state.
 * @returns {string} `out.vert` The given/new `state.vert` vertex shader GLSL.
 * @returns {string} `out.frag` The given `state.frag` fragment shader GLSL.
 * @returns {object} `out.uniforms` The given/new `state.uniforms`.
 * @returns {number} `out.count` The given/new `state.count`.
 * @returns {api.buffer} `out.positions` The given/new `state.positions`; passed
 *     through `api.buffer`.
 * @returns {array.string} `[out.verts]` Any cached pre-processed vertex shaders
 *     GLSL, if `state.cacheGLSL` was enabled.
 * @returns {array.string} `[out.frags]` Any cached pre-processed fragment
 *     shaders GLSL, if `state.cacheGLSL` was enabled.
 * @returns {api.command} `out.pass` A GL command function to draw a given pass.
 * @returns {function} `out.run` The main step function, which performs all the
 *     draw pass GL commands for a given state step.
 */
export function getStep(api, state, cacheGLSL = true, out = {}) {
    const { buffer, command = api } = api;

    let {
        maps: { passes },
        step: {
                vert = vertDef, frag, macroPass: macro = macroPass,
                uniforms = getUniforms(state),
                positions = positionsDef, count = positions.length*scale.vec2
            }
        } = state;

    out.vert = vert;
    out.frag = frag;
    out.uniforms = uniforms;
    out.count = count;
    positions = out.positions = buffer(positions);

    if(cacheGLSL) {
        // Pre-process the shaders needed for all the passes.
        const verts = out.verts = [];
        const frags = out.frags = [];
        const stateCache = { ...state };

        each((pass, p) => {
                stateCache.passNow = p;

                const passMacros = macro(stateCache);

                verts[p] = passMacros+vert;
                frags[p] = passMacros+frag;
            },
            passes);
    }

    out.pass = command(out.passCommand = {
        // Uses the full-screen vertex shader state by default.
        vert: ((cacheGLSL)?
                (c, { step: { pass: p, vert: v = vert, verts: vs = verts } }) =>
                    (vs[p] || v)
            :   (c, props) => macro(props)+(props.step.vert || vert)),
        frag: ((cacheGLSL)?
                (c, { step: { pass: p, frag: f = frag, frags: fs = frags } }) =>
                    (fs[p] || f)
            :   (c, props) => macro(props)+(props.step.frag || frag)),
        attributes: {
            position: (c, { step: { positions: p = positions } }) => p
        },
        uniforms,
        count: (c, { step: { count: n = count } }) => n,
        depth: { enable: false },
        framebuffer: (c, { steps, stepNow, passNow }) =>
            wrapGet(stepNow, steps)[passNow]
    });

    const cache = {
        props: null
    };

    out.run = (props) => {
        const { step: { pass, onPass, onStep }, maps: { passes } } = props;

        ++props.stepNow;
        (onStep && onStep(props));

        each((pass, p) => {
                props.passNow = p;
                pass((onPass)? onPass(props) : props);
            },
            passes);

        return props;
    };

    return out;
}

export default getStep;
