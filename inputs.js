import { setC2 } from '@thi.ng/vectors/setc';
import { map, range, each, wrapGet } from '@epok.tech/array-utils';

/**
 * Common uniform inputs for GPGPU `step` and `draw`.
 *
 * @see [getState]{@link ./state.js#getState}
 *
 * @export
 * @param {object} api The API to set up WebGL resources.
 * @param {object} state The GPGPU state to use - see `getState`.
 * @param {number} [bound=1] The number of steps bound to outputs, unavailable
 *     as inputs.
 *
 * @returns {object} The uniforms object for the given GPGPU `state`.
 */
export function getUniforms(api, state, bound = 1) {
    const { prop } = api;
    const cache = { viewShape: [0, 0] };

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
        viewShape: ({ viewportWidth: w, viewportHeight: h }) =>
            setC2(cache.viewShape, w, h)
    };

    // Set up the past steps, as the number of steps into the past from the
    // current step ([1...(steps-1)]).
    const {
            steps: { length: stepsLen }, groups: { textures: groupsTextures }
        } = state;

    const texturesLen = groupsTextures.length;

    const addTexture = (past, texture) =>
        uniforms[`states[${(past*texturesLen)+texture}]`] = (c, props) =>
            wrapGet(props.step+past+bound, props.textures)[texture].texture;

    for(let past = stepsLen-1-bound; past >= 0; --past) {
        each((values, texture) => addTexture(past, texture), groupsTextures);
    }

    return uniforms;
}

export const numPairIndexes = ({ steps, size: { index } }, bound = 1) =>
    (steps.length-1-bound)*2*index;

export const getDrawIndexes = (state, bound = 1) =>
    map((v, i) => i, range(numPairIndexes(state, bound)), 0);
