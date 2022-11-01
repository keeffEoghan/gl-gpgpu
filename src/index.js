/**
 * **Main `index.js` - see [`readme`](..)**
 *
 * [![`gl-gpgpu` particles demo](media://demo-particles-regl-frames.png)](..)
 *
 * [GPGPU](https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units)
 * state-stepping - declaratively maps optimal draw passes, shaders, `WebGL`
 * resources, inputs, outputs - lets you focus on your logic, BYO-renderer.
 *
 * Decouples logic from rendering approach/engine.
 * The modules and many hooks may be used as given, or piecemeal, or overridden.
 *
 * @module (index)
 * @category Main
 * @category JS
 */

import './api';
import { mapStep } from './maps';
import { getState } from './state';
import { getStep } from './step';

/**
 * Sets up all the maps, inputs, resources, etc for a `gpgpu` process.
 * Each component may also be used individually, see their documentation.
 *
 * @see {@link maps.mapStep}
 * @see {@link maps.mapGroups}
 * @see {@link maps.mapSamples}
 * @see {@link state.getState}
 * @see {@link uniforms.getUniforms}
 * @see {@link step.getStep}
 * @see {@link macros.macroPass}
 *
 * @param {object} api An API for `GL` resources. See `getState` and `getStep`.
 * @param {object} [api.limits=api] A map of `GL` resource limits.
 * @param {number} [api.limits.maxDrawbuffers] The maximum number of `GL`
 *   `texture`s a `framebuffer` can bind in a single draw call.
 * @param {object} [state=\{\}] State properties to set up; a new `object` by
 *   default. See `getState`, `getUniforms`, and `getStep`.
 * @param {object} [state.maps] How values are grouped per-`texture` per-pass
 *   per-step. Sets up new maps if not given or missing its mapped properties.
 *   See `mapStep`.
 * @param {number} [state.maps.buffersMax=api.limits.maxDrawbuffers] Maximum
 *   number of `texture`s per draw pass. Uses more passes above this limit.
 * @param {object} [to=state] The state `object` to set up. Modifies the given
 *   `state` object by default.
 *
 * @returns {object} The given `to` `object`, set up for a `gpgpu` process.
 *   See `mapStep`, `getState`, `getUniforms`, `getStep`, `macroPass` for parts.
 */
export function gpgpu(api, state = {}, to = state) {
  const { maxDrawbuffers, glsl } = api.limits ?? api;
  const { maps = {} } = state;
  const { buffersMax } = maps;

  to.glsl = parseFloat(glsl.match(/[0-9\.]+/)?.[0], 10);

  // Set up maps, and undo any modifications to the input.
  maps.buffersMax ??= maxDrawbuffers;
  mapStep(maps, to.maps ??= {});
  maps.buffersMax = buffersMax;

  // Set up the rest.
  getState(api, state, to);
  getStep(api, state, to.step ??= {});

  return to;
}

export default gpgpu;
