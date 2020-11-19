/**
 * GPGPU ping-pong buffers, state.
 *
 * @todo In-place updates of complex resources and meta info.
 * @todo Use transform feedback instead of data textures, if supported (WebGL2)?
 * @todo Consider class/object/data/function structure further.
 */

import { range, map, reduce } from '@epok.tech/array-utils';

import { mapGroups } from './maps';

/**
 * The required and optional GL extensions for a GPGPU state.
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

export const valuesDef = [4];
export const channelsMinDef = 4;
export const channelsMaxDef = 4;
export const texturesMaxDef = 1;

/**
 * Set up the GPGPU resources and meta information for a state of a number data.
 *
 * @todo Transform feedback.
 * @todo Validation.
 * @todo Reorder the given `values` into the most efficient `maps`?
 *
 * @example
 *     const state = { maps: mapGroups([4, 2, 3], 4, 4), steps: 2 };
 *
 *     getState(api, state); // =>
 *     {
 *         ...state, passNow: -1, stepNow: -1,
 *         size: {
 *             type: 'float', steps: 2, passes: 2, textures: 6,
 *             width: 1024, height: 1024, shape: [1024, 1024], count: 1048576
 *         },
 *         steps: [[api.framebuffer], [api.framebuffer]],
 *         passes: [
 *             [
 *                 {
 *                     step: 0, index: 0, count: 0, map: [0, 1, 2],
 *                     framebuffer: api.framebuffer,
 *                     textures: [api.texture, api.texture, api.texture]
 *                 }
 *             ],
 *             [
 *                 {
 *                     step: 1, index: 0, count: 1, map: [0, 1, 2],
 *                     framebuffer: api.framebuffer,
 *                     textures: [api.texture, api.texture, api.texture]
 *                 }
 *             ]
 *         ],
 *         textures: [
 *             [
 *                 {
 *                     step: 0, pass: 0, index: 0, count: 0, map: [0],
 *                     texture: api.texture
 *                 },
 *                 {
 *                     step: 0, pass: 0, index: 1, count: 1, map: [1],
 *                     texture: api.texture
 *                 },
 *                 {
 *                     step: 0, pass: 0, index: 2, count: 2, map: [2],
 *                     texture: api.texture
 *                 }
 *             ],
 *             [
 *                 {
 *                     step: 1, pass: 0, index: 0, count: 3, map: [0],
 *                     texture: api.texture
 *                 },
 *                 {
 *                     step: 1, pass: 0, index: 1, count: 4, map: [1],
 *                     texture: api.texture
 *                 },
 *                 {
 *                     step: 1, pass: 0, index: 2, count: 5, map: [2],
 *                     texture: api.texture
 *                 }
 *             ]
 *         ]
 *     };
 *
 *     Object.assign(state,
 *         { maps: mapGroups([4, 2, 3], 1, 4), type: 'uint8', stepNow: 2 });
 *
 *     getState(api, state); // =>
 *     {
 *        ...state, passNow: -1, stepNow: 2,
 *        size: {
 *            type: 'uint8', steps: 2, passes: 6, textures: 6,
 *            width: 1024, height: 1024, shape: [1024, 1024], count: 1048576
 *        },
 *        steps: [
 *            [api.framebuffer, api.framebuffer, api.framebuffer],
 *            [api.framebuffer, api.framebuffer, api.framebuffer]
 *        ],
 *        passes: [
 *            [
 *                {
 *                    step: 0, index: 0, count: 0, map: [0],
 *                    framebuffer: api.framebuffer, textures: [api.texture]
 *                },
 *                {
 *                    step: 0, index: 1, count: 1, map: [1],
 *                    framebuffer: api.framebuffer, textures: [api.texture]
 *                },
 *                {
 *                    step: 0, index: 2, count: 2, map: [2],
 *                    framebuffer: api.framebuffer, textures: [api.texture]
 *                }
 *            ],
 *            [
 *                {
 *                    step: 1, index: 0, count: 3, map: [0],
 *                    framebuffer: api.framebuffer, textures: [api.texture]
 *                },
 *                {
 *                    step: 1, index: 1, count: 4, map: [1],
 *                    framebuffer: api.framebuffer, textures: [api.texture]
 *                },
 *                {
 *                    step: 1, index: 2, count: 5, map: [2],
 *                    framebuffer: api.framebuffer, textures: [api.texture]
 *                }
 *            ]
 *        ],
 *        textures: [
 *            [
 *                {
 *                    step: 0, pass: 0, index: 0, count: 0, map: [0],
 *                    texture: api.texture
 *                },
 *                {
 *                    step: 0, pass: 1, index: 1, count: 1, map: [1],
 *                    texture: api.texture
 *                },
 *                {
 *                    step: 0, pass: 2, index: 2, count: 2, map: [2],
 *                    texture: api.texture
 *                }
 *            ],
 *            [
 *                {
 *                    step: 1, pass: 0, index: 0, count: 3, map: [0],
 *                    texture: api.texture
 *                },
 *                {
 *                    step: 1, pass: 1, index: 1, count: 4, map: [1],
 *                    texture: api.texture
 *                },
 *                {
 *                    step: 1, pass: 2, index: 2, count: 5, map: [2],
 *                    texture: api.texture
 *                }
 *            ]
 *        ]
 *    };
 *
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [mapSamples]{@link ./maps.js#mapSamples}
 * @see [getStep]{@link ./step.js#getStep}
 * @see [macroPass]{@link ./macros.js#macroPass}
 *
 * @export
 * @param {object} api The API to set up GL resources.
 * @param {function} api.texture A function to create a GL texture.
 * @param {function} api.framebuffer A function to create a GL framebuffer.
 * @param {object} [api.limits=api] A map of GL resource limits.
 * @param {number} [api.limits.maxDrawbuffers=texturesMaxDef] The maximum number
 *     of GL textures a framebuffer can bind in a single draw call.
 * @param {object} state The state parameters.
 * @param {number} [state.radius] The length of the sides of the data textures
 *     to allocate. If given, supersedes the `state` `width`/`height`/`scale`.
 * @param {number} [state.width] The width of the data textures to allocate.
 *     If given, supersedes `state.scale`.
 * @param {number} [state.height] The height of the data textures to allocate.
 *     If given, supersedes `state.scale`.
 * @param {number} [state.scale=10] The length of the sides of the data textures
 *     to allocate; gives a square power-of-two texture raising 2 to this power.
 * @param {number} [state.steps=2] How many steps of state to track (1 or more).
 * @param {object} [state.maps] How `state.values` are grouped
 *     per-texture-per-pass-per-step. Set up here if not given. See `mapGroups`.
 * @param {array<number>} [state.maps.values=valuesDef] How values of each
 *     data item may be grouped into textures across passes. See `mapGroups`.
 * @param {number} [state.maps.channelsMin=channelsMinDef] The minimum allowed
 *     channels for framebuffer attachments. Sets up unused channels as needed
 *     to reach this limit.
 * @param {number} [state.maps.channelsMax=channelsMaxDef] The maximum allowed
 *     channels for textures. Sets up more textures as needed above this limit.
 * @param {number} [state.maps.texturesMax=api.limits.maxDrawbuffers] The
 *     maximum number of textures to use per draw pass. Uses more passes above
 *     this limit.
 * @param {number} [state.maps.textures] How values are grouped into textures.
 *     Set up if not given. See `mapGroups`.
 * @param {string} [state.type='float'] The data type of the textures.
 * @param {number} [out.stepNow=-1] The currently active state step, if any.
 * @param {number} [out.passNow=-1] The currently active draw pass, if any.
 * @param {object} [out=state] The state object to set up. Modifies the given
 *     `state` object by default; or a new object if not given.
 *
 * @returns {object} `out` The state object, set up with the data resources and
 *     meta information, for step/draw later:
 * @returns {object<number,array<number,array<number>>>} `out.maps` Any
 *     given `state.maps`, or a newly set-up one. See `mapGroups`.
 * @returns {array<array<object<api.texture,number,array<number>>>>}
 *     `out.textures` Textures per step, as arrays of objects of `api.texture`,
 *     and meta info. See `out.maps.textures`.
 * @returns {array<array<object<api.framebuffer,number,array<number>>>>}
 *     `out.passes` Passes per step, as arrays of objects of `api.framebuffer`,
 *     referencing `out.textures`, and meta info. See `out.maps.passes`.
 * @returns {array<api.framebuffer<array<api.texture>>>} `out.steps`
 *     Hierarchy of steps of state, as an array of `api.framebuffer` from
 *     `out.passes`, with arrays of `api.texture` from `out.textures`, and meta
 *     information. See `mapGroups`.
 *     State data may be drawn into the framebuffers accordingly. See `getStep`.
 * @returns {object<number,string,array<number>>} `out.size` Size/type
 *     information on data resources.
 * @returns {number} `out.stepNow` The currently active state step, as given.
 * @returns {number} `out.passNow` The currently active draw pass, as given.
 */
export function getState(api, state, out = state) {
    // See usage here for what the API must implement.
    const { texture, framebuffer, limits = api } = api;
    const { maxDrawbuffers = texturesMaxDef } = limits;

    const {
            radius, width, height, scale = 10, type = 'float', steps = 2,
            // Tracking currently active state/pass.
            stepNow = -1, passNow = -1,
            // How resources will be set up per-pass, with given `state.values`.
            maps = mapGroups(valuesDef, maxDrawbuffers, channelsMaxDef)
        } = state;

    out.maps = maps;
    out.stepNow = stepNow;
    out.passNow = passNow;

    const {
            // The allowable range of channels for framebuffer attachments.
            // Default avoids `RGB32F` framebuffer attachments, which errors on
            // Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1448632
            channelsMin = (state.channelsMin || channelsMinDef),
            values = valuesDef, textures: textureMap
        } = maps;

    maps.channelsMin = channelsMin;
    maps.values = values;
    maps.textures = textureMap;

    const textureProps = {
        type,
        // Passing `state.scale` ensures a power-of-two square texture size.
        width: (radius || width || 2**scale),
        height: (radius || height || 2**scale)
    };

    // Size of the created resources.
    const size = out.size = {
        ...textureProps, steps, textures: 0, passes: 0,
        shape: [textureProps.width, textureProps.height],
        count: textureProps.width*textureProps.height
    };

    const textures = out.textures = [];
    const passes = out.passes = [];

    const addTexture = (step, pass, textureProps) => (index) =>
        ((textures[step] || (textures[step] = []))[index] = {
            // Meta info.
            step, pass, index, count: size.textures++, map: textureMap[index],
            // Resources.
            texture: texture(textureProps)
        })
        .texture;

    const addPass = (step) => (pass, index) => {
        // All framebuffer color attachments need the same number of channels.
        const passProps = {
            ...textureProps,
            channels: reduce((max, t) =>
                    reduce((max, v) => Math.max(max, values[v]),
                        textureMap[t], max),
                pass, channelsMin)
        };

        const textures = map(addTexture(step, index, passProps), pass);

        const f = framebuffer({
            width: passProps.width,
            height: passProps.height,
            color: textures,
            depthStencil: false
        });

        (passes[step] || (passes[step] = []))[index] = {
            // Meta info.
            step, index, count: size.passes++, map: pass,
            // Resources.
            textures, framebuffer: f
        };

        return f;
    };

    // Set up resources we'll need to store data per-texture-per-pass-per-step.
    out.steps = map((v, step) => map(addPass(step), maps.passes),
        range(steps), 0);

    return out;
}

export default getState;
