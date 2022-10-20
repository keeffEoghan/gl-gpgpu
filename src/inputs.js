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
 * const state = { pre: '', steps: 2, maps: mapValues({ values: [1, 2, 3] }) };
 * const api = {};
 *
 * getUniforms(getState(api, { ...state, merge: false }, {})); // =>
 * {
 *   stepNow: (context, state) => {},
 *   stateShape: (context, state) => {},
 *   viewShape: (context, state) => {},
 *   // Separate data-`texture`s, an `array` of `sampler`s (e.g: `sampler2D[]`).
 *   // Data-`texture`s for the 1st step ago, not bound as outputs.
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
 *   // Separate data-`texture`s, an `array` of `sampler`s (e.g: `sampler2D[]`).
 *   // Data-`texture`s for the 1st step ago, not bound as outputs.
 *   'states[0]': (context, state) => {},
 *   'states[1]': (context, state) => {}
 *   // Data-`texture`s for the 2nd step ago, not bound as outputs.
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
 *   // All states merged into one data-`texture` upon every pass; for
 *   // `sampler2D`, or `sampler3D`/`sampler2DArray` where supported.
 *   states: (context, state) => {},
 *   // Separate data-`texture`s not used.
 *   'states[0]': (context, state) => null,
 *   'states[1]': (context, state) => null,
 *   // ...etc...
 * };
 * ```
 *
 * @see {@link uniforms}
 * @see {@link getUniform}
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
 *   `state` data-`texture`s (each as `[width, height]`), with properties:
 *   - `shape`: Any `state` shape.
 *   - `merge.shape`: Any merged `states` shape, otherwise `state` shape.
 *
 *   See `getState`.
 *
 * @param {number} [state.bound=boundDef] Number of steps bound for output, not
 *   used for input; for platforms preventing read/write of the same `texture`.
 * @param {object} [state.uniforms] Any `object` to merge the new `uniforms`
 *   into. See `to`.
 * @param {object} [to=state.uniforms] Any `object` to contain the `uniform`
 *   hooks; modifies any `state.uniforms`, or a new `object` if not given.
 *   See `state.uniforms` and `uniforms`.
 *
 * @returns {uniforms} The `to` set up with `uniform` hooks for the given
 *   `state`. See `uniforms`.
 */
export function getUniforms(state, to = state.uniforms ?? {}) {
  const { pre: n = preDef, steps, maps, bound = boundDef } = state;
  const { textures } = maps;
  const stepsL = steps.length ?? steps;
  const texturesL = textures.length;
  const stateShape = [];
  const viewShape = [];

  to[n+'stepNow'] = (_, s) => s.stepNow;

  /**
   * Shape of any data-`texture`, and any other relevant data shape (any
   * `merge`d `texture` or the same data-`texture` shape).
   * Sets properties to `null`ish if there's no valid shape.
   */
  to[n+'stateShape'] = (_, { size: { shape: s, merge: m } }) =>
    ((s)? setC4(stateShape, ...s, ...(m?.shape ?? s)) : setC4(stateShape));

  to[n+'viewShape'] = ({ drawingBufferWidth: w, drawingBufferHeight: h }) =>
    setC2(viewShape, w, h);

  /**
   * Past steps, all merged into one `texture`.
   * Only returns a value if using a `merge`d `texture`; otherwise `null`.
   */
  to[n+'states'] = (_, s) => s.merge?.all?.texture ?? null;

  /**
   * Past steps, each some steps `ago`, from the current active step at `0`, as
   * `[0,... stepsL-1-bound]`.
   */
  const addTextures = (ago) =>
    /**
     * Hooks to pull a given `texture` by the active pass `props`; lets `GLSL`
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
 * @typedef {object} uniforms
 *
 * The `uniform` callback hooks for a given `state`, to be called on each render
 * pass to get the latest `uniform` values.
 *
 * Its property names may be prefixed with any given `state.pre`.
 *
 * **See**
 * - {@link state.getState}
 * - {@link step.getStep}
 *
 * @property {getUniform} stepNow Gives any current step. See `getStep`.
 *
 * @property {getUniform} stateShape Gives any size of `state` data-`texture`s
 *   (as a `vec4` of `[[width, height], [width, height]]`; channels are
 *   `null`ish if there's no valid shape):
 *   - Any `state` shape; in `xy` channels.
 *   - Any merged `states` shape, otherwise `state` shape; in `zw` channels.
 *
 *   See `getState`.
 *
 * @property {getUniform} viewShape Gives the shape of the `GL` viewport (as a
 *   `vec2` of `[width, height]`).
 *
 * @property {getUniform} states Gives the past steps data-`texture`s as either:
 *   - Any merged data-`texture` as a single `GLSL` `sampler` (e.g: `2D`/
 *     `2DArray`/`3D`; up to to the `GL` API for `texture`); otherwise `null`.
 *   - Any separate data-`texture`s as a `GLSL` `array` of `sampler`s (e.g:
 *     `sampler2D[]`), each part/all of a `gpgpu` step's data and accessible by
 *     constant index (steps ago); otherwise `null`.
 *
 *   See `getStep`.
 */

/**
 * @todo [Fix `@callback`:  nested `@param`, `@return`/`@see`/etc details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @typedef {(context: {
 *     drawingBufferWidth:number,
 *     drawingBufferHeight:number
 *   },
 *   props: {
 *     stepNow:number,
 *     bound:number,
 *     merge:{texture:object},
 *     textures:{texture:object}[][]
 *   }) => number|number[]|texture|object} getUniform
 *
 * Function hook to update a `uniform` on each render pass for its latest value.
 *
 * **See**
 * - {@link getUniforms}
 * - {@link state.getState}
 * - {@link state.texture}
 *
 * **Parameters**
 * - `context`: General or global properties.
 *   - `drawingBufferWidth`: Current `GL` viewport width in pixels.
 *   - `drawingBufferHeight`: Current `GL` viewport height in pixels.
 * - `props`: Local properties (`gpgpu` `state`).
 *   - `stepNow`: The current step of the `gpgpu` `state`.
 *   - `bound`: Number of steps bound to output; can't be bound as inputs.
 *   - `merge`: Any `object` containing merged data-`texture`.
 *     - `texture`: Any merged data-`texture`.
 *   - `textures`: Textures per-step, as `array`s of `object`s with a `texture`
 *     property. See `getState`.
 *
 * **Returns**
 * - `uniform` A `GL` uniform to be bound via a `GL` API.
 */

export default getUniforms;
