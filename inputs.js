/**
 * GPGPU inputs (uniforms, attributes, indexes, etc).
 */

import { setC2 } from '@thi.ng/vectors/setc';
import map from '@epok.tech/fn-lists/map';
import range from '@epok.tech/fn-lists/range';
import each from '@epok.tech/fn-lists/each';
import wrap from '@epok.tech/fn-lists/wrap-index';

import { boundDef, preDef } from './const';

/**
 * Uniform inputs for GPGPU calls, such as in `getStep`.
 * Uniforms are defined as callback hooks called at each pass, using properties
 * from given global context and local state objects, allowing different APIs or
 * author-defined hooks.
 *
 * @example
 *     const state = { steps: 2, maps: getMaps({ values: [1, 2, 3] };
 *
 *     getUniforms(state); // =>
 *     {
 *         stepNow: (context, state) => {},
 *         dataShape: (context, state) => {},
 *         viewShape: (context, state) => {},
 *         // Data textures for the 1st step ago not bound as an output.
 *         'states[0]': (context, state) => {},
 *         'states[1]': (context, state) => {}
 *     };
 *
 *     getUniforms({ ...state, steps: 3 }); // =>
 *     {
 *         stepNow: (context, state) => {},
 *         dataShape: (context, state) => {},
 *         viewShape: (context, state) => {},
 *         // Data textures for the 1st step ago not bound as an output.
 *         'states[0]': (context, state) => {},
 *         'states[1]': (context, state) => {}
 *         // Data textures for the 2nd step ago not bound as an output.
 *         'states[2]': (context, state) => {},
 *         'states[3]': (context, state) => {}
 *     };
 *
 * @see [getStep]{@link ./step.js#getStep}
 * @see [getState]{@link ./state.js#getState}
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 *
 * @param {object} state The GPGPU state to use. See `getState` and `mapGroups`.
 * @param {array|number} state.steps The array of steps, or number of steps.
 *     See `getState`.
 * @param {object} state.maps How values are grouped per-texture per-pass
 *     per-step. See `mapGroups`.
 * @param {array<array<number>>} state.maps.textures How values are grouped into
 *     textures. See `mapGroups`.
 * @param {number} [state.bound=boundDef] How many steps are bound as outputs,
 *     unavailable as input; for platforms forbidding read/write of same buffer.
 * @param {string} [state.pre=preDef] Namespace prefix; `preDef` if not given.
 * @param {object} [to=(state.uniforms ?? {})] The object to contain the
 *     uniforms; `state.uniforms` or a new object if not given.
 *
 * @returns {object<function>} `to` The uniform hooks for the given `state`.
 *     Each is a function called on each pass, taking 2 arguments:
 *     - Object of general/global properties; containing e.g: `viewportWidth`.
 *     - Object of local properties; e.g: the given `state`.
 */
export function getUniforms(state, to = (state.uniforms ?? {})) {
    const {
            bound = boundDef, pre: n = preDef, steps,
            steps: { length: stepsL = steps }, maps: { textures: textureMap }
        } = state;

    const texturesL = textureMap.length;
    const cache = { viewShape: [] };

    to[n+'stepNow'] = (_, { stepNow: s }) => s;
    to[n+'dataShape'] = (_, { size: { shape: s } }) => s;

    to[n+'viewShape'] = ({ viewportWidth: w, viewportHeight: h }) =>
        setC2(cache.viewShape, w, h);

    /**
     * Set up the ago steps, as the number of steps ago from the currently
     * bound step `[0,... stepsL-1-bound]`.
     */
    const addTexture = (ago, texture) =>
        // Hook to pull a given texture from the latest `props`.
        to[`${n}states[${(ago*texturesL)+texture}]`] =
            (_, { stepNow: s, bound: b = bound, textures }) =>
                wrap.get(s-b-ago, textures)[texture].texture;

    // Flatten all input textures, as uniforms are stored in flat arrays.
    for(let ago = 0, pl = stepsL-bound; ago < pl; ++ago) {
        each((_, texture) => addTexture(ago, texture), textureMap);
    }

    return to;
}

/**
 * Gives the number of indexes to draw a full state, for various parameters.
 * Effectively equivalent to `gl_VertexID` in WebGL2.
 *
 * @see [getState]{@link ./state.js#getState}
 *
 * @param {object|array<number>|number} size Size/type information of data
 *     resources, or a shape array of width and height numbers, or width if
 *     height is given as a second parameter.
 * @param {number} [size.count] The number of entries of each data-texture.
 * @param {array<number>} [size] The width/height of each data-texture.
 * @param {number} [size.width] The width of each data-texture.
 * @param {number} [size.height] The height of each data-texture.
 * @param {number} [size.x] The width of each data-texture.
 * @param {number} [size.y] The height of each data-texture.
 * @param {number} [size.shape] The shape of each data-texture.
 * @param {array<number>} [size.shape] The width/height of each data-texture.
 *
 * @param {number} [height] The height of each data-texture.
 *
 * @returns {number} The number of indexes needed to draw a full state; each
 *     entry of a data-texture (its area, equivalent to `state.size.count`).
 */
export const countDrawIndexes = (size, height) => (size.count ??
    ((size[0] ?? size.width ?? size.x ?? size.shape?.[0] ?? size)*
        (size[1] ?? size.height ?? size.y ?? size.shape?.[1] ?? height ?? 1)));

/**
 * Gives the array of indexes needed to draw a full state.
 *
 * @param {number|object<number>} size The number of entries in each
 *     data-texture; or an object of size/type information on data resources.
 *
 * @returns {array<number>} An array of indexes for drawing all data-texture
 *     entries, numbered `0` to `size-1`.
 */
export const getDrawIndexes = (size) => map((_, i) => i,
    range(Number.isInteger(size)? size : countDrawIndexes(size)), 0);
