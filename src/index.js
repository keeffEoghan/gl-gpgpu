/**
 * **Main `index.js` - see [`readme`](..)**
 *
 * [![`gl-gpgpu` particles demo](media://demo-particles-regl-frames.png)](..)
 *
 * [GPGPU](https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units)
 * state-stepping - declaratively maps optimal draw passes, shaders, `GL`
 * resources, inputs, outputs - lets you focus on your logic, BYO-renderer.
 *
 * Decouples logic from rendering approach/engine.
 * Each module and hook may be used as given, or piecemeal, or overridden.
 *
 * @module (root)
 * @category Root
 * @category JS
 */

import './api';
import { glslRx } from './const';
import { mapStep } from './maps';
import { toData } from './data';
import { toUniforms } from './uniforms';
import { toStep } from './step';

const { isFinite } = Number;

/**
 * Parse a `GLSL` version into a `number`.
 *
 * @see {@link const.glslRx}
 *
 * @param {string|number} version A `GLSL` version `string`, expected in a `GL`
 *   parameter `SHADING_LANGUAGE_VERSION` format to parse into a `number`, from
 *   any first found version number or the full given `string` otherwise; or a
 *   `number`, to use as-is.
 *
 * @returns {number} A `GLSL` version `number`, parsed from the given `version`.
 */
export const getGLSL = (version) =>
  ((isFinite(version))? version
  : parseFloat(version?.match?.(glslRx)?.[0] ?? version, 10));

/**
 * Sets up all the maps, data, inputs, and commands for a `gpgpu` process.
 *
 * Hooks up each main part in order into the complete process. Each part may
 * also be used individually for more custom behaviour; see their documentation.
 *
 * @see {@link maps.mapStep}
 * @see {@link maps.mapGroups}
 * @see {@link maps.mapSamples}
 * @see {@link maps.useBuffers}
 * @see {@link data.toData}
 * @see {@link uniforms.toUniforms}
 * @see {@link step.toStep}
 * @see {@link macros.macroPass}
 *
 * @param {object} api An API for `GL` resources. See `toData` and `toStep`.
 * @param {object} [api.limits=api] A map of `GL` resource limits.
 * @param {number} [api.limits.maxDrawbuffers] The maximum number of `GL`
 *   `texture`s a `framebuffer` can bind in a single draw call.
 * @param {object} [state=\{\}] State properties to set up; a new `object` by
 *   default. See `toData`, `toUniforms`, and `toStep`.
 * @param {object} [state.maps] How values are grouped per-`texture` per-pass
 *   per-step. Sets up new maps if not given or missing its mapped properties.
 *   See `mapStep`.
 * @param {number|false} [state.maps.buffersMax=api.limits.maxDrawbuffers]
 *   Maximum `texture`s that may be bound as buffer outputs per-pass. Multiple
 *   passes per-step are needed to output all `values` if they're spread across
 *   more `textures` than this `number`. Uses one pass and binds no output if
 *   given `false`y; useful for side-effects with no state outputs, like
 *   rendering. See `useBuffers`, `mapGroups`, and `toData`.
 * @param {object} [to=state] The `object` to set up. Modifies the given `state`
 *   object by default.
 *
 * @returns {object} The given `to` data `object`; set up with data resources
 *   for a `gpgpu` process. See `mapStep`, `toData`, `toUniforms`, `toStep`.
 */
export function gpgpu(api, state = {}, to = state) {
  const { maxDrawbuffers, glsl: apiGLSL } = api.limits ?? api;
  const { maps = {}, glsl = apiGLSL } = state;
  const { buffersMax } = maps;

  /** The parsed `GLSL` version. */
  to.glsl = getGLSL(glsl);

  /**
   * Temporary updates to set up `maps` then `state`.
   * Any `maps.buffersMax` supersedes any `maxDrawbuffers` from the `api`.
   */
  maps.buffersMax ??= maxDrawbuffers;
  state.maps = mapStep(maps, to.maps ??= {});

  toData(api, state, to);
  toUniforms(state, to.uniforms ??= {});
  toStep(api, state, to);

  // Undo any temporary changes made above to the given `maps` and `state`.
  /** @todo Improve, this is awkward. */
  (state.maps = maps).buffersMax = buffersMax;

  return to;
}

export default gpgpu;
