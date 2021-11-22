/**
 * GPGPU update step.
 */

import each from '@epok.tech/fn-lists/each';
import { wrapGet } from '@epok.tech/fn-lists/wrap-index';

import { macroPass } from './macros';
import { getUniforms } from './inputs';
import { vertDef, positionsDef, preDef } from './const';

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
 * @param {object} api An API for GL resources.
 * @param {function} api.buffer A function to set up a GL buffer.
 * @param {function} api.command A function to call a GL draw, with all options.
 * @param {object} state The GPGPU state to use. See `getState` and `mapGroups`.
 * @param {object} state.maps How values are grouped per-texture per-pass
 *     per-step. See `mapGroups`.
 * @returns {array<array<number>>} `to.passes` How textures are grouped into
 *     passes. See `mapGroups`.
 * @param {string} [state.pre=preDef] The namespace prefix; `preDef` by default.
 * @param {object} [state.step=to] The properties for the step GL command.
 * @param {string} [state.step.vert=vertDef] The step vertex shader GLSL; a
 *     simple flat screen shader if not given.
 * @param {string} state.step.frag The step fragment shader GLSL.
 * @param {object} [state.step.uniforms=getUniforms(state)] The step uniforms;
 *     modifies any given. See `getUniforms`.
 * @param {array|api.buffer} [state.step.positions=positionsDef()] The step
 *     position attributes; 3 points of a large flat triangle if not given.
 * @param {number} [state.step.count=state.step.positions.length*scale.vec2] The
 *     number of elements/attributes to draw.
 * @param {array} [state.step.verts] Preprocesses and caches vertex GLSL code
 *     per-pass if given, otherwise processes it just-in-time before each pass.
 * @param {array} [state.step.frags] Preprocesses and caches fragment GLSL code
 *     per-pass, otherwise processes it just-in-time before each pass.
 * @param {object} [to={}] The results object; a new object if not given.
 *
 * @returns {object} `to` The given `to` object; containing a GPGPU update
 *     step function and related properties, to be passed a GPGPU state.
 * @returns {string} `to.vert` The given/new `state.vert` vertex shader GLSL.
 * @returns {string} `to.frag` The given `state.frag` fragment shader GLSL.
 * @returns {array.string} `[to.verts]` Any cached pre-processed vertex shaders
 *     GLSL, if `state.step.verts` was given.
 * @returns {array.string} `[to.frags]` Any cached pre-processed fragment
 *     shaders GLSL, if `state.step.verts` was enabled.
 * @returns {object} `to.uniforms` The given `state.uniforms`.
 * @returns {number} `to.count` The given/new `state.count`.
 * @returns {api.buffer} `to.positions` The given/new `state.positions`; passed
 *     through `api.buffer`.
 * @returns {api.command} `to.pass` A GL command function to draw a given pass.
 * @returns {function} `to.run` The main step function, which performs all the
 *     draw pass GL commands for a given state step.
 */
export function getStep(api, state, to = {}) {
    const { buffer, command = api } = api;
    const { maps: { passes }, pre = preDef, step = to } = state;
    let { positions = positionsDef() } = step;

    const {
            vert = vertDef, verts, frag, frags, uniforms,
            count = positions.length*scale.vec2
        } = step;

    to.vert = vert;
    to.frag = frag;
    to.uniforms = getUniforms(state, uniforms);
    to.count = count;
    positions = to.positions = buffer(positions);

    if((verts && (to.verts = verts)) || (frags && (to.frags = frags))) {
        // Pre-process the shaders needed for all the passes.
        const stateCache = { ...state };

        each((pass, p) => {
                stateCache.passNow = p;

                const passMacros = macroPass(stateCache);

                (verts && (verts[p] = passMacros+vert));
                (frags && (frags[p] = passMacros+frag));
            },
            passes);
    }

    to.pass = command(to.passCommand = {
        // Uses the full-screen vertex shader state by default.
        vert(_, props) {
            const { passNow: p, step } = props;
            const { vert: v = vert, verts: vs = verts } = step;

            return vs?.[p] ?? macroPass(props)+v;
        },
        frag(_, props) {
            const { passNow: p, step } = props;
            const { frag: f = frag, frags: fs = frags } = step;

            return fs?.[p] ?? macroPass(props)+f;
        },
        attributes: {
            [pre+'position']: (_, { step: { positions: p = positions } }) => p
        },
        uniforms,
        count,
        depth: { enable: false },
        framebuffer: (_, { steps: ss, stepNow: s, passNow: p }) =>
            wrapGet(s, ss)[p]
    });

    to.run = (props = state) => {
        const { steps, step, maps: { passes } } = props;
        const stepNow = ++props.stepNow;
        const { pass, onPass, onStep } = step;

        onStep?.(props, wrapGet(stepNow, steps));

        each((passProps, p) => {
                props.passNow = p;
                pass(onPass?.(props, passProps) ?? props);
            },
            passes);

        return props;
    };

    return to;
}

export default getStep;
