/**
 * GPGPU state-stepping: maps minimal draw passes, shaders, GL resources,
 * inputs, outputs. BYORenderer.
 *
 * Rendering approach/engine specific, decoupled from the physics code.
 * The modules and many hooks may be used as given, or piecemeal, or overridden.
 */

import { mapGroups, mapSamples } from './maps';
import { getState } from './state';
import { getStep } from './step';

export * from './const';

/**
 * Sets up all the maps, inputs, resources, etc for a GPGPU process.
 *
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [mapSamples]{@link ./maps.js#mapSamples}
 * @see [getState]{@link ./step.js#getState}
 * @see [getUniforms]{@link ./step.js#getUniforms}
 * @see [getStep]{@link ./step.js#getStep}
 * @see [macroPass]{@link ./macros.js#macroPass}
 *
 * @param {object} api An API for GL resources. See `getState` and `getStep`.
 * @param {object} [api.limits=api] A map of GL resource limits.
 * @param {number} [api.limits.maxDrawbuffers] The maximum number of GL textures
 *     a framebuffer can bind in a single draw call.
 * @param {object} [state={}] State properties to set up; a new object by
 *     default. See `getState`, `getUniforms`, and `getStep`.
 * @param {object} [state.maps] How values are grouped per-texture per-pass
 *     per-step. Sets up new maps if not given or missing its mapped properties.
 *     See `mapGroups`.
 * @param {number} [state.maps.texturesMax=api.limits.maxDrawbuffers] The
 *     maximum number of textures to use per draw pass. Uses more passes above
 *     this limit.
 * @param {object} [out=state] The state object to set up. Modifies the given
 *     `state` object by default.
 */
export function gpgpu(api, state = {}, out = state) {
    const { maxDrawbuffers: texturesMax, glsl } = (api.limits || api);
    const { maps = {} } = state;

    out.glsl = parseFloat(glsl.match(/[0-9\.]+/)[0]);

    (maps.texturesMax ?? (maps.texturesMax = texturesMax));
    ((('textures' in maps) && ('passes' in maps)) || mapGroups(maps));
    ((('derives' in maps) && !('samples' in maps)) && mapSamples(maps));
    out.maps = maps;

    getState(api, state, out);
    out.step = getStep(api, state);

    return out;
}

export default gpgpu;
