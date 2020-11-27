/**
 * GPGPU inputs (uniforms, attributes, indexes, etc).
 */

import { setC2 } from '@thi.ng/vectors/setc';
import map from '@epok.tech/fn-lists/map';
import range from '@epok.tech/fn-lists/range';
import each from '@epok.tech/fn-lists/each';
import wrap from '@epok.tech/fn-lists/wrap-index';
import isNumber from '@epok.tech/is-type/number';

import { boundDef, preDef } from './const';

/**
 * Common uniform inputs for GPGPU `step` and `draw`.
 * Uniforms are defined as callback hooks pulling from given `context` and
 * `props` properties, allowing different APIs or author-defined hooks.
 *
 * @see [getState]{@link ./state.js#getState}
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 *
 * @export
 * @param {object} state The GPGPU state to use. See `getState` and `mapGroups`.
 * @param {array} state.steps The steps of state. See `getState`.
 * @param {object} state.maps How values are grouped per-texture per-pass
 *     per-step. See `mapGroups`.
 * @param {array<array<number>>} state.maps.textures How values are grouped into
 *     textures. See `mapGroups`.
 * @param {number} [state.bound=boundDef] How many steps are bound as outputs,
 *     unavailable as inputs.
 * @param {string} [state.pre=preDef] The namespace prefix; `preDef` by default.
 * @param {object} [out={}] The object to contain the uniforms.
 *
 * @returns {object<function>} `out` The uniform hooks for the given `state`.
 *     Each is a function taking 2 arguments: a `context` object of general
 *     or global properties, and a `props` object of local properties (such as
 *     the given `state`).
 */
export function getUniforms(state, out = {}) {
    const {
            steps: { length: stepsL }, maps: { textures: textureMap },
            bound = boundDef, pre: n = preDef
        } = state;

    const texturesL = textureMap.length;
    const cache = { viewShape: range(2) };

    out[n+'stepNow'] = (_, { stepNow: s }) => s;
    out[n+'dataShape'] = (_, { size: { shape: s } }) => s;
    out[n+'viewShape'] = ({ viewportWidth: w, viewportHeight: h }) =>
        setC2(cache.viewShape, w, h);

    // Set up the past steps, as the number of steps into the past from the
    // currently bound step ([1...(steps-1)]).

    const addTexture = (past, texture) =>
        // Hook to pull a given texture from the latest `props`.
        out[`${n}states[${(past*texturesL)+texture}]`] =
            (_, { stepNow: s, bound: b = bound, textures }) =>
                wrap.get(s+b+past, textures)[texture].texture;

    // Flatten all input textures, as uniforms are stored in flat arrays.
    for(let past = stepsL-1-bound; past >= 0; --past) {
        each((v, texture) => addTexture(past, texture), textureMap);
    }

    return out;
}

/**
 * Gives the number of indexes needed to draw a full state.
 *
 * @param {object} size Size/type information on data resources.
 * @param {number} [size.width] The width of each data-texture.
 * @param {number} [size.height] The height of each data-texture.
 * @param {number} [size.count=size.width*size.height] How many entries are in
 *     each data-texture; that is, its area (width*height).
 *
 * @returns {number} The number of indexes needed to draw a full state.
 */
export const countDrawIndexes = ({ width: w, height: h, count = w*h }) => count;

/**
 * Gives the array of indexes needed to draw a full state.
 *
 * @param {number|object<number>} size The number of entries in each
 *     data-texture; or an object of size/type information on data resources.
 *
 * @returns {array<number>} An array of indexes for drawing all data-texture
 *     entries.
 */
export const getDrawIndexes = (size) =>
    map((v, i) => i, range(isNumber(size)? size : countDrawIndexes(size)), 0);
