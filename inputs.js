import { map, range, each, wrapGet } from 'array-utils';

/**
 * Common uniform inputs for GPGPU `step` and `draw`.
 *
 * @see [getGPGPUState]{@link ./state.js#getGPGPUState}
 *
 * @export
 * @param {object} api The API to set up WebGL resources.
 * @param {object} state The GPGPU state to use - see `getGPGPUState`.
 * @param {number} [bound=1] The number of steps bound to outputs, and unavailable as
 *     inputs.
 *
 * @returns {object} The uniforms object for the given GPGPU `state`.
 */
export function getGPGPUUniforms(api, state, bound = 1) {
    const { prop } = api;

    const cache = {
        viewShape: [0, 0]
    };

    // @todo Move non-generic things out of here.
    const uniforms = {
        stepNow: prop('step'),
        steps: prop('steps.length'),
        stepsPast: (c, { steps: { length: s } }) => s-bound,
        passNow: prop('pass'),
        passes: prop('passes.length'),
        // Move to the concerns of `time`
        // dt: regl.prop('dt'),
        // stepTime: regl.prop('stepTime'),
        // tick: regl.context('tick'),
        // time: regl.context('time'),
        dataShape: prop('size.shape'),
        viewShape: ({ viewportWidth: w, viewportHeight: h }) => {
            const { viewShape: s } = cache;

            s[0] = w;
            s[1] = h;

            return s;
        }
    };

    // Set up uniforms for the steps in the past [1...(steps-1)] of the current step.
    // Referenced as the number of steps into the past from the current step.

    const { steps: { length: numSteps }, groups: { textures: groupsTextures } } = state;
    const numTextures = groupsTextures.length;

    const addTexture = (past, texture) =>
        uniforms[`states[${(past*numTextures)+texture}]`] = (c, { step, textures }) =>
                wrapGet(step+past+bound, textures)[texture].texture;

    for(let past = numSteps-1-bound; past >= 0; --past) {
        each((values, texture) => addTexture(past, texture), groupsTextures);
    }

    return uniforms;
}

export const numGPGPUPairIndexes =
    ({ steps: { length: s }, size: { index: i } }, bound = 1) => (s-1-bound)*2*i;

export const getGPGPUDrawIndexes = (state, bound = 1) =>
    map((v, i) => i, range(numGPGPUPairIndexes(state, bound)), 0);
