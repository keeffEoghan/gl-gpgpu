/**
 * The `gpgpu` inputs for `GL` `uniform`s.
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
 * The `uniform`s are defined as callback hooks to be called on each render pass
 * with global context and local state `object`s, allowing the use of different
 * `GL` APIs or author-defined hooks.
 *
 * Handles inputs of states as `array`s of data-`texture`s, or merged into one
 * data-`texture`; for `array`s of `texture`s, this arranges them on each step
 * so `GLSL` can dynamically sample the flattened `array` of `texture`s by a
 * constant step index; otherwise the single merged `texture` is bound once, and
 * `GLSL` can use a dynamic step index to sample states.
 *
 * @example ```javascript
 * const state = { pre: '', steps: 2, maps: mapStep({ values: [1, 2, 3] }) };
 * const api = {};
 *
 * getUniforms(getState(api, { ...state, merge: false }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   stateShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // Separate state data-`texture`s in an `array` (e.g: `sampler2D[]`).
 *   // State data-`texture`s for the 1st step ago, not bound as outputs.
 *   'states[0]': (context, state) => {},
 *   'states[1]': (context, state) => {},
 *   // Merged `texture` not used.
 *   states: (context, state) => null
 * };
 *
 * getUniforms(getState(api, { ...state, steps: 3, merge: false }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   stateShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // Separate state data-`texture`s in an `array` (e.g: `sampler2D[]`).
 *   // State data-`texture`s for the 1st step ago, not bound as outputs.
 *   'states[0]': (context, state) => {},
 *   'states[1]': (context, state) => {}
 *   // State data-`texture`s for the 2nd step ago, not bound as outputs.
 *   'states[2]': (context, state) => {},
 *   'states[3]': (context, state) => {},
 *   // Merged `texture` not used.
 *   states: (context, state) => null
 * };
 *
 * getUniforms(getState(api, { ...state, merge: true }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   stateShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // Merged states in one data-`texture` upon every pass (e.g: `sampler2D`,
 *   // or `sampler3D`/`sampler2DArray` where supported).
 *   states: (context, state) => {},
 *   // Separate data-`texture`s not used.
 *   'states[0]': (context, state) => null,
 *   'states[1]': (context, state) => null
 * };
 * ```
 *
 * @see {@link step.getStep}
 * @see {@link state.getState}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroSamples}
 * @see {@link macros.macroTaps}
 *
 * @param {object} state The `gpgpu` state. See `getState` and `mapGroups`.
 * @param {array|number} state.steps The `array` of steps, or number of steps.
 *   See `getState`.
 * @param {{textures?:number[][]}} state.maps How values are grouped into
 *   data-`texture`s (per-pass per-step). See `mapGroups`.
 * @param {string} [state.pre=preDef] Namespace prefix; `preDef` if not given.
 * @param {{all?:{texture?:object}}} [state.merge] Any merged state `texture`;
 *   uses separate state data-`texture`s if not given. See `getState`.
 *
 * @param {{shape?:number[],merge?:{shape?:number[]}}} [state.size] Any size of
 *   `state` data-`texture`s (as `vec2(width, height)`); with:
 *   - `shape`: Any `state` shape.
 *   - `merge.shape`: Any merged `states` shape, otherwise `state` shape.
 *
 *   See `getState`.
 *
 * @param {number} [state.bound=boundDef] Number of steps bound for output, not
 *   used for input; for platforms preventing read/write of the same `texture`.
 * @param {uniforms|object} [state.uniforms] Any `object` to merge the new
 *   `uniforms` into. See `to`.
 * @param {uniforms|object} [to=state.uniforms] Any `object` to contain the
 *   `uniform` hooks; modifies any `state.uniforms`, or a new `object` if not
 *   given. See `state.uniforms` and `uniforms`.
 *
 * @returns {{
 *     stepNow:(c,state:{stepNow:number})=>number,
 *     stateShape:(c,state:{size:{number}})=>[number,number,number,number],
 *     viewShape:(
 *       context:{drawingBufferWidth:number,drawingBufferHeight:number},s?
 *     )=>[number,number],
 *     states:()=>([])
 *   }}
 *
 * @param {{
 *     stepNow?:number,
 *     bound?:number,
 *     merge?:{texture:object},
 *     textures:{texture:object}[][]
 *   }} state Local properties (the `gpgpu` `state`); with:
 *   - `stepNow`: The current step of the `gpgpu` `state`.
 *   - `bound`: Number of steps bound to output; can't be bound as inputs.
 *   - `merge`: Any `object` containing merged data-`texture`.
 *     - `texture`: Any merged data-`texture`.
 *   - `textures`: Textures per-step, as `array`s of `object`s with a `texture`
 *     property. See `getState`.
 *
 *   The `to` set up with `uniform` callback hooks for the given `state`, to
 *   be called on each render pass for the latest `uniform` values; with:
 *   - `stepNow`: Gives any current step. See `getStep`.
 *   - `stateShape`: Gives any shape of any data-`texture`s; as
 *     `vec4(vec2(width, height), vec2(width, height))`; channels are `null`ish
 *     if there's no valid shape; with:
 *     - Any `state` shape; in `xy` channels.
 *     - Any merged `states` shape, otherwise `state` shape; in `zw` channels.
 *   - `viewShape`: Gives the `GL` viewport shape; as `vec2(width, height)`;
 *     given a `context` parameter with:
 *     - `drawingBufferWidth`: Current `GL` viewport width in pixels.
 *     - `drawingBufferHeight`: Current `GL` viewport height in pixels.
 *   - `states`: Gives the past steps data-`texture`s; as either:
 *     - Any merged data-`texture` as a single `GLSL` `sampler` (e.g: `2D`/
 *       `2DArray`/`3D`; up to to the `GL` API for `texture`); otherwise `null`.
 *     - Any separate data-`texture`s as a `GLSL` `array` of `sampler`s (e.g:
 *       `sampler2D[]`), each part/all of a `gpgpu` step's data and accessible
 *       by constant index (steps ago); otherwise `null`.
 *
 *   These property names may be prefixed with any given `state.pre`.
 *   See `getState` and `getStep`.
 */
export function getUniforms(state, to = state.uniforms ?? {}) {
  const { pre: n = preDef, steps, maps, bound = boundDef } = state;
  const { textures } = maps;
  const stepsL = steps.length ?? steps;
  const texturesL = textures.length;
  const stateShape = [];
  const viewShape = [];

  /** Gives any current step. */
  to[n+'stepNow'] = (_, s) => s.stepNow;

  /** Gives any shape of `state` and any merged `states` data-`texture`s. */
  to[n+'stateShape'] = (_, { size: { shape: s, merge: m } }) =>
    ((s)? setC4(stateShape, ...s, ...(m?.shape ?? s)) : setC4(stateShape));

  /** Gives the shape of the `GL` viewport. */
  to[n+'viewShape'] = ({ drawingBufferWidth: w, drawingBufferHeight: h }) =>
    setC2(viewShape, w, h);

  /**
   * Gives all `states` merged in one `texture`, if using `merge`;
   * otherwise gives `null`.
   */
  to[n+'states'] = (_, s) => s.merge?.all?.texture ?? null;

  /**
   * Past steps, each some steps `ago`, from the current active step at `0`, as
   * `[0,... stepsL-1-bound]`.
   */
  const addTextures = (ago) =>
    /**
     * Hooks to pull a given `texture` by the active pass `state`; lets `GLSL`
     * access the `array` of `texture`s by constant index (steps ago).
     * Only returns a value if not using a `merge`d `texture`; otherwise `null`.
     */
    each((_, t) => to[n+`states[${(ago*texturesL)+t}]`] =
        (_, { merge: m, stepNow: s, bound: b = bound, textures: ts }) =>
          ((m)? null : wrap(s-b-ago, ts)?.[t]?.texture),
      textures);

  /** Flatten all input `texture`s, as `uniform`s are kept in flat `array`s. */
  for(let ago = 0, pl = stepsL-bound; ago < pl; ++ago) { addTextures(ago); }

  return to;
}

/**
 * @todo [Fix `@callback`/`@typedef`](https://github.com/TypeStrong/typedoc/issues/1896):
 *   nested `@param`; omits `@return`/`@see`/`@this`
 *
 * @callback getUniform
 * A `function` hook to update a `GL` `uniform` value for a render pass.
 *
 * **See**
 * - {@link getUniforms}
 * - {@link state.getState}
 * - {@link state.texture}
 *
 * **Returns**
 * A `GL` uniform to be bound via a `GL` API.
 *
 * @param {{
 *     drawingBufferWidth:number,
 *     drawingBufferHeight:number
 *   }} context General or global properties; with:
 *   - `drawingBufferWidth`: Current `GL` viewport width in pixels.
 *   - `drawingBufferHeight`: Current `GL` viewport height in pixels.
 *
 * @param {{
 *     stepNow?:number,
 *     bound?:number,
 *     merge?:{texture:object},
 *     textures:{texture:object}[][]
 *   }} state Local properties (the `gpgpu` `state`); with:
 *   - `stepNow`: The current step of the `gpgpu` `state`.
 *   - `bound`: Number of steps bound to output; can't be bound as inputs.
 *   - `merge`: Any `object` containing merged data-`texture`.
 *     - `texture`: Any merged data-`texture`.
 *   - `textures`: Textures per-step, as `array`s of `object`s with a `texture`
 *     property. See `getState`.
 *
 * @returns {number|number[]|texture|object}
 */
