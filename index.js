/**
 * GPGPU current/past state-stepping - map minimal passes of shaders,
 * GL resources, inputs, outputs - BYORenderer.
 *
 * Rendering approach/engine specific, decoupled from the physics code.
 * The modules and many hooks may be used as given, or piecemeal, or overridden.
 */

import { mapGroups, mapSamples } from './maps';
import { getState } from './state';
import { getUniforms, countDrawIndexes, getDrawIndexes } from './inputs';
import { getStep } from './step';

export function gpgpu(api, state, out = state) {
    const {
            values, derives, channelsMax, texturesMax, bound, cacheGLSL,
            maps = mapGroups(values, channelsMax, texturesMax),
            uniforms = {}
        } = state;

    out.maps = ((derives)? mapSamples(maps) : maps);
    getState(api, state, out);
    out.uniforms = getUniforms(state, bound, uniforms);
    getStep(api, state, cacheGLSL, out);

    return out;
}

export default gpgpu;
