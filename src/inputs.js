/**
 * The `gpgpu` inputs - `uniforms`, `attribute`s, indexes, etc.
 *
 * @module
 * @category JS
 */

import { setC2, setC4 } from '@thi.ng/vectors/setc';
import each from '@epok.tech/fn-lists/each';
import wrap from '@epok.tech/fn-lists/wrap';

import { boundDef, preDef } from './const';

/**
 * Sets up `GL` `uniform` inputs for `gpgpu` calls, such as in `getStep`.
 *
 * The `uniform`s are defined as callback hooks to be called at each pass with
 * global context and local state `object`s, allowing the use of different `GL`
 * APIs or author-defined hooks.
 *
 * Handles inputs of states as `array`s of data-`texture`s, or merged into one
 * data-`texture`; for `array`s of `texture`s, this arranges them on each step
 * so `GLSL` can dynamically sample the flattened `array` of `texture`s by a
 * constant step index; otherwise the single merged `texture` is bound once, and
 * `GLSL` can use a dynamic step index to sample states.
 *
 * @example ```javascript
 * const state = { pre: '', steps: 2, maps: mapValues({ values: [1, 2, 3] }) };
 * const api = {};
 *
 * getUniforms(getState(api, { ...state, merge: false }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   dataShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // Data-`texture`s kept separate in a `sampler2D[]`.
 *   // Data-`texture`s for the 1st step ago not bound as an output.
 *   'states[0]': (context, state) => {},
 *   'states[1]': (context, state) => {},
 *   // Merged `texture` not used.
 *   states: (context, state) => null
 * };
 *
 * getUniforms(getState(api, { ...state, steps: 3, merge: false }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   dataShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // Data-`texture`s kept separate in a `sampler2D[]`.
 *   // Data-`texture`s for the 1st step ago not bound as an output.
 *   'states[0]': (context, state) => {},
 *   'states[1]': (context, state) => {}
 *   // Data-`texture`s for the 2nd step ago not bound as an output.
 *   'states[2]': (context, state) => {},
 *   'states[3]': (context, state) => {},
 *   // Merged `texture` not used.
 *   states: (context, state) => null
 * };
 *
 * getUniforms(getState(api, { ...state, merge: true }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   dataShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // All states merged into one data-`texture` upon every pass; for
 *   // `sampler2D`, or `sampler3D`/`sampler2DArray` where supported.
 *   states: (context, state) => {},
 *   // Separate data-`texture`s not used.
 *   'states[0]': (context, state) => null,
 *   'states[1]': (context, state) => null
 * };
 * ```
 *
 * @see {@link getUniform}
 * @see {@link step.getStep}
 * @see {@link state.getState}
 * @see {@link size.countDrawIndexes}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroSamples}
 * @see {@link macros.macroTaps}
 *
 * @param {object} state The `gpgpu` state. See `getState` and `mapGroups`.
 * @param {array|number} state.steps The `array` of steps, or number of steps.
 *   See `getState`.
 * @param {object} state.maps How values are grouped per-`texture` per-pass
 *   per-step. See `mapGroups`.
 * @param {array.<array.<number>>} state.maps.textures How values are grouped
 *   into `texture`s. See `mapGroups`.
 * @param {string} [state.pre=preDef] Namespace prefix; `preDef` if not given.
 * @param {{all:{texture:object}}} [state.merge] Any merged state `texture`; uses separate state
 *   `texture`s if not given. See `getState`.
 * @param {object} [state.size] Any size of `state` data. See `getState`.
 * @param {array.<number>} [state.size.shape] Any data shape (width, height).
 *   See `getState`.
 * @param {object} [state.size.merge] Any size of merged data. See `getState`.
 * @param {array.<number>} [state.size.merge.shape] Any merged data shape
 *   (width, height). See `getState`.
 * @param {number} [state.bound=boundDef] Number of steps bound for output, not
 *   used for input; for platforms forbidding read/write of the same `texture`.
 * @param {object} [to=state.uniforms ?? \{\}] The `object` to contain the
 *   uniforms; `state.uniforms` or a new `object` if not given.
 *
 * @returns {object.<number,array.<number>,object,getUniform>} `to` The uniform
 *   hooks for the given `state`. Each is a static number or `array` of numbers;
 *   or a `GL` object such as a `texture`; or a `getUniform` function returning
 *   one, to be called on each pass.
 */
export function getUniforms(state, to = state.uniforms ?? {}) {
  const { pre: n = preDef, steps, maps, bound = boundDef } = state;
  const { textures } = maps;
  const stepsL = steps.length ?? steps;
  const texturesL = textures.length;
  const dataShape = [];
  const viewShape = [];

  to[n+'stepNow'] = (_, s) => s.stepNow;

  /**
   * Shape of any data-`texture`, and any other relevant data shape (any
   * `merge`d `texture` or the same data-`texture` shape).
   * Sets properties to `null`ish if there's no valid shape.
   */
  to[n+'dataShape'] = (_, { size: { shape: s, merge: m } }) =>
    ((s)? setC4(dataShape, ...s, ...(m?.shape ?? s)) : setC4(dataShape));

  to[n+'viewShape'] = ({ drawingBufferWidth: w, drawingBufferHeight: h }) =>
    setC2(viewShape, w, h);

  /**
   * Past steps, all merged into one `texture`.
   * Only returns a value if using a `merge`d `texture`; `null` otherwise.
   */
  to[n+'states'] = (_, s) => s.merge?.all?.texture ?? null;

  /**
   * Past steps, each some steps `ago`, from the current active step at `0`, as
   * `[0,... stepsL-1-bound]`.
   */
  const addTextures = (ago) =>
    /**
     * Hooks to pull a given `texture` from the active pass `props`.
     * `GLSL` dynamically accesses array of `texture`s by a constant index.
     * Only returns a value if not using a `merge`d `texture`; `null` otherwise.
     */
    each((_, t) => to[n+`states[${(ago*texturesL)+t}]`] =
        (_, { merge: m, stepNow: s, bound: b = bound, textures: ts }) =>
          ((m)? null : wrap(s-b-ago, ts)?.[t]?.texture),
      textures);

  // Flatten all input textures, as uniforms are stored in flat arrays.
  for(let ago = 0, pl = stepsL-bound; ago < pl; ++ago) { addTextures(ago); }

  return to;
}

/**
 * @todo [Fix `@callback`:  nested `@param`, `@return`/`@see`/etc details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @typedef {(context: {
 *     drawingBufferWidth: number,
 *     drawingBufferHeight: number
 *   },
 *   props: {
 *     stepNow: number,
 *     bound: number,
 *     merge: { texture: object },
 *     textures: array.<array.<{ texture: object }>>
 *   }) => number|array.<number>|object} getUniform
 *
 * Function hook to update a uniform on each pass.
 *
 * **See**
 * - {@link getUniforms}
 * - {@link state.getState}
 *
 * **Parameters**
 * - `context`: General or global properties.
 *   - `drawingBufferWidth`: Current view width in pixels.
 *   - `drawingBufferHeight`: Current view height in pixels.
 * - `props`: Local properties (`gpgpu` `state`).
 *   - `stepNow`: The current step of the `gpgpu` `state`.
 *   - `bound`: Number of steps bound to output, cannot be input.
 *   - `merge`: Object containing merged texture.
 *     - `texture`: Merged texture.
 *   - `textures`: Textures per step, as arrays of objects with a `texture`
 *     property. See `getState`.
 *
 * **Returns**
 * - `uniform` A `GL` uniform to be bound via a `GL` API.
 */

export default getUniforms;
