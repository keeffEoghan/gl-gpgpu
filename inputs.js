/**
 * The `gpgpu` inputs (uniforms, attributes, indexes, etc).
 *
 * @module
 */

import { setC2, setC4 } from '@thi.ng/vectors/setc';
import each from '@epok.tech/fn-lists/each';
import wrap from '@epok.tech/fn-lists/wrap';

import { boundDef, preDef } from './const';

/**
 * Uniform inputs for `gpgpu` calls, such as in `getStep`.
 * Uniforms are defined as callback hooks called at each pass, using properties
 * from given global context and local state objects, allowing different APIs or
 * author-defined hooks.
 *
 * Handles inputs of states as arrays of textures, or merged in one texture;
 * for arrays of textures, textures are arranged here on each step so `GLSL` can
 * dynamically access the flattened array of textures by constant step index;
 * otherwise the single merged texture is bound once, and `GLSL` can use dynamic
 * current step to access states by texture sampling.
 *
 * @example ```
 *   const state = { pre: '', steps: 2, maps: mapFlow({ values: [1, 2, 3] }) };
 *
 *   getUniforms(getState({}, state)); // =>
 *   {
 *     stepNow: (context, state) => {},
 *     dataShape: (context, state) => {},
 *     viewShape: (context, state) => {},
 *     // Data textures kept separate in a `sampler2D[]`.
 *     // Data textures for the 1st step ago not bound as an output.
 *     'states[0]': (context, state) => {},
 *     'states[1]': (context, state) => {}
 *   };
 *
 *   getUniforms(getState({}, { ...state, steps: 3 })); // =>
 *   {
 *     stepNow: (context, state) => {},
 *     dataShape: (context, state) => {},
 *     viewShape: (context, state) => {},
 *     // Data textures kept separate in a `sampler2D[]`.
 *     // Data textures for the 1st step ago not bound as an output.
 *     'states[0]': (context, state) => {},
 *     'states[1]': (context, state) => {}
 *     // Data textures for the 2nd step ago not bound as an output.
 *     'states[2]': (context, state) => {},
 *     'states[3]': (context, state) => {}
 *   };
 *
 *   getUniforms(getState({}, { ...state, merge: true })); // =>
 *   {
 *     stepNow: (context, state) => {},
 *     dataShape: (context, state) => {},
 *     viewShape: (context, state) => {},
 *     // All states merged into one data texture upon every pass; for
 *     // `sampler2D`, or `sampler3D` or `sampler2DArray` where supported.
 *     states: (context, state) => {}
 *   };
 * ```
 *
 * @see {@link getUniform}
 * @see {@link step.getStep}
 * @see {@link state.getState}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroSamples}
 * @see {@link macros.macroTaps}
 *
 * @param {object} state The `gpgpu` state. See `getState` and `mapGroups`.
 * @param {string} [state.pre=preDef] Namespace prefix; `preDef` if not given.
 * @param {object} [state.size] Size information of the `state`. See `getState`.
 * @param {array<number>} [state.size.shape] The data's shape. See `getState`.
 * @param {array|number} state.steps The array of steps, or number of steps.
 *   See `getState`.
 * @param {object} [state.merge] Any merged state texture; uses separate state
 *   textures if not given. See `getState`.
 * @param {object} state.maps How values are grouped per-texture per-pass
 *   per-step. See `mapGroups`.
 * @param {array<array<number>>} state.maps.textures How values are grouped into
 *   textures. See `mapGroups`.
 * @param {number} [state.bound=boundDef] Number of steps bound to output,
 *   cannot be input; for platforms forbidding read/write of same buffer.
 * @param {object} [to=(state.uniforms ?? \{\})] The object to contain the
 *   uniforms; `state.uniforms` or a new object if not given.
 *
 * @returns {object<number,array<number>,object,getUniform>} `to` The uniform
 *   hooks for the given `state`. Each is a static number or array of numbers;
 *   or a `GL` object such as a texture; or a `getUniform` function returning
 *   one, to be called on each pass.
 */
export function getUniforms(state, to = (state.uniforms ?? {})) {
  const { pre: n = preDef, steps, maps, bound = boundDef } = state;
  const stepsL = steps.length ?? steps;
  const { textures } = maps;
  const texturesL = textures.length;
  const dataShape = [];
  const viewShape = [];

  to[n+'stepNow'] = (_, s) => s.stepNow;

  to[n+'dataShape'] = (_, { size: s }) =>
    ((!(s?.shape))? set4(dataShape)
    : setC4(dataShape, ...s.shape, ...(s.merge?.shape ?? s.shape)));

  to[n+'viewShape'] = ({ drawingBufferWidth: w, drawingBufferHeight: h }) =>
    setC2(viewShape, w, h);

  /**
   * Past steps, all merged into one `texture`.
   * Only returns a value if using a `merge`d `texture`.
   */
  to[n+'states'] = (_, s) => s.merge?.all?.texture;

  /**
   * Past steps, each some steps `ago`, from the current active step at `0`, as
   * `[0,... stepsL-1-bound]`.
   */
  const addTextures = (ago) =>
    /**
     * Hooks to pull a given `texture` from the active pass `props`.
     * `GLSL` dynamically accesses array of `texture`s by a constant index.
     * Only returns a value if not using a `merge`d `texture`.
     */
    each((_, t) => to[n+`states[${(ago*texturesL)+t}]`] =
        (_, { merge: m, stepNow: s, bound: b = bound, textures: ts }) =>
          m || wrap(s-b-ago, ts)?.[t]?.texture,
      textures);

  // Flatten all input textures, as uniforms are stored in flat arrays.
  for(let ago = 0, pl = stepsL-bound; ago < pl; ++ago) { addTextures(ago); }

  return to;
}

/**
 * @typedef {(context: {
 *     drawingBufferWidth: number,
 *     drawingBufferHeight: number
 *   },
 *   props: {
 *     stepNow: number,
 *     bound: number,
 *     merge: { texture: {} },
 *     textures: array<array<{ texture: {} }>>
 *   }) => number|array<number>|object} getUniform
 *
 * Function hook to update a uniform on each pass.
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
 *
 * @todo [Fix `@callback` format for nested parameters](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getUniforms}
 * @see {@link state.getState}
 */

export default getUniforms;
