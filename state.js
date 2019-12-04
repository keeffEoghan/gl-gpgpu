/**
 * GPGPU ping-pong buffers, state.
 *
 * @todo In-place updates of complex resources and meta info.
 * @todo Use transform feedback instead of data textures where supported (WebGL2)?
 * @todo Consider class/object/data/function structure further.
 * @todo Consider splitting these concerns into dedicated approaches.
 */

import { range, map, reduce } from '../util/array';
import { getGPGPUGroupsMap, getGPGPUSamplesMap } from './maps';

/**
 * The required and optional WebGL extensions for this GPGPU state.
 *
 * @todo
 * For drawing into floating-point buffers:
 * `oes_texture_float` and `oes_texture_half_float` are required dependencies of
 * `webgl_color_buffer_float` and `ext_color_buffer_half_float`, respectively.
 *
 * @todo Can these be optional? Fallbacks? `ext_color_buffer_half_float`?
 * @export
 */
export const extensions = ['oes_texture_float', 'webgl_color_buffer_float'];
export const optionalExtensions = ['webgl_draw_buffers'];
// export const optionalExtensions = [];

/**
 * Set up the GPGPU resources and meta information for the state of a number of data
 * items.
 *
 * @todo Transform feedback.
 * @todo Validation.
 * @todo Reorder the given `values` into the most efficient `groups`?
 *
 * @see [getGPGPUGroupsMap]{@link ./maps.js#getGPGPUGroupsMap}
 * @see [getGPGPUSamplesMap]{@link ./maps.js#getGPGPUSamplesMap}
 * @see [getGPGPUStep]{@link ./step.js#getGPGPUStep}
 * @see [macroGPGPUPass]{@link ./macros.js#macroGPGPUPass}
 *
 * @export
 * @param {object} api The API to set up WebGL resources.
 * @param {object} [state={}] The state parameters.
 * @param {number} [state.radius] The length of the sides of the data textures to
 *     allocate. If given, supersedes `state.width`, `state.height`, and `state.scale`.
 * @param {number} [state.width] The width of the data textures to allocate. If given,
 *     supersedes `state.scale`, if `state.radius` isn't given.
 * @param {number} [state.height] The height of the data textures to allocate. If given,
 *     supersedes `state.scale`, if `state.radius` isn't given.
 * @param {number} [state.scale=10] The length of the sides of the data textures to
 *     allocate. Given as the power by which to raise 2, ensuring a power-of-two square
 *     texture. Used if `state.width`, `state.height`, or `state.radius` aren't given.
 * @param {number} [state.steps=2] How many steps of state to track (should be > 1).
 * @param {array.<number>} [state.values=[4]] How values of each data item may be
 *     grouped into textures across passes - see `getGPGPUGroupsMap` and `out.groups`.
 * @param {number} [state.texturesMax=api.maxDrawbuffers] The maximum number of
 *     textures to use per draw pass. Extra passes will be used above this limit.
 * @param {number} [state.channelsMin=4] The minimum allowable number of channels for
 *     framebuffer attachments. Unused channels created as needed to reach this limit.
 * @param {number} [state.channelsMax=4] The maximum allowable number of channels for
 *     textures. Extra textures created as needed above this limit.
 * @param {string} [state.type='float'] The data type of the textures.
 * @param {array.<array.<(null|number|array.<number>)>>} [state.derives] Any values
 *     which derive their state from other values - see `getGPGPUSamplesMap`.
 * @param {(string|function|falsey)} [state.macros] How GLSL preprocessor macro
 *     definitions and prefixes may be generated later - see `macroGPGPUPass`.
 * @param {object} [out=state] The state object to set up. Modifies the given `state`
 *     object by default; new object if not given.
 *
 * @returns {object} `out` The state object, set up with the data resources and meta
 *     information, for later step/draw:
 * @returns {array} `out.values` The given `state.values`.
 * @returns {array} `[out.derives]` The given `state.derives`, if any.
 * @returns {number} `out.texturesMax` The given `state.texturesMax`.
 * @returns {(string|function|falsey)} `out.macros` The given `state.macros`.
 * @returns {object.<array.<number>, array.<array.<number>>, array.<array.<number>>>}
 *     `out.groups` How `state.values` are grouped into textures and passes per step -
 *     see `getGPGPUGroupsMap`.
 * @returns {array.<array.<array.<number>>>} `[out.groups.samples]` If any
 *     `state.derives` were given, the samples are set up - see `getGPGPUSamplesMap`.
 * @returns {array.<array.<array.<number>>>} `[out.groups.reads]` If any
 *     `state.derives` were given, the reads are set up - see `getGPGPUSamplesMap`.
 * @returns {object.<number>} `out.size` Info about the sizes of the resources created.
 * @returns {array.<array.<object.<texture, array.<number>, number,...>>>}
 *     `out.textures` Textures per step, as arrays of objects of `textures`, and
 *     meta info - see `out.groups.textures`.
 * @returns {array.<array.<object.<framebuffer, array.<number>, number,...>>>}
 *     `out.passes` Passes per step, as arrays of objects of `framebuffers`,
 *     with textures from `out.textures`, and meta info - see `out.groups.passes`.
 * @returns {array.<framebuffer.<array.<texture>>>} `out.steps` Hierarchy of steps
 *     of state, as an array of `framebuffers` from `out.passes`, with arrays of
 *     `textures` from `out.textures`, and meta info - see `getGPGPUGroupsMap`.
 *     State data may be drawn into the framebuffers accordingly - see `getGPGPUStep`.
 *
 * @returns {number} `out.step` The currently active state step.
 * @returns {number} `out.pass` The currently active framebuffer pass.
 */
export function getGPGPUState(api, state = {}, out = state) {
    const { texture, framebuffer, limits } = api;
    const { maxDrawbuffers = 1 } = (limits || api);

    const {
            radius,
            width,
            height,
            scale = 3,
            // scale = 6,
            // scale = 10,
            steps = 2,
            values = [1],
            type = 'float',
            macros,
            derives,

            texturesMax = maxDrawbuffers,

            // The range of allowable number of channels for framebuffer attachments.
            // channelsMin = 3;
            // Avoids `RGB32F` framebuffer attachments, which throws error on Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1448632
            channelsMin = 4,
            channelsMax = 4
        } = state;

    out.values = values;
    out.texturesMax = texturesMax;
    out.macros = macros;


    // How the resources will be created for each pass, according to given `values`.
    const groups = out.groups = getGPGPUGroupsMap(values, texturesMax, channelsMax);

    // Passing `state.scale` ensures a power-of-two square texture size.
    const textureSetup = {
        type,
        width: (radius || width || 2**scale),
        height: (radius || height || 2**scale)
    };

    // Size of the created resources.
    const size = out.size = {
        shape: [textureSetup.width, textureSetup.height],
        width: textureSetup.width,
        height: textureSetup.height,
        index: textureSetup.width*textureSetup.height,
        passes: 0,
        textures: 0
    };

    const textures = out.textures = [];
    const passes = out.passes = [];

    const addTexture = (step, pass, textureSetup) => (index) => {
        const t = texture(textureSetup);

        (textures[step] || (textures[step] = []))[index] = {
            // Meta info.
            number: size.textures++,
            step,
            pass,
            index,
            group: groups.textures[index],
            // Resources.
            texture: t
        };

        return t;
    };

    const addPass = (step) => (pass, index) => {
        // All framebuffer color attachments must have the same number of channels.
        const passSetup = {
            type: 'float',
            channels: reduce((max, b) =>
                    reduce((max, v) => Math.max(max, values[v]),
                        groups.textures[b], max),
                pass, channelsMin),
            ...textureSetup
        };

        const textures = map(addTexture(step, index, passSetup), pass);

        const f = framebuffer({
            width: passSetup.width,
            height: passSetup.height,
            color: textures,
            depthStencil: false
        });

        (passes[step] || (passes[step] = []))[index] = {
            // Meta info.
            number: size.passes++,
            step,
            index,
            group: pass,
            // Resources.
            textures,
            framebuffer: f
        };

        return f;
    };

    // Set up resources we'll need to store data per-texture-per-pass-per-step.
    out.steps = map((v, step) => map(addPass(step), groups.passes), range(steps), 0);

    // Tracking currently active state/pass.
    out.step = out.pass = -1;

    // If `derives` given, set it up.
    ((out.derives = derives) && getGPGPUSamplesMap(derives, groups));

    return out;
}

export default getGPGPUState;
