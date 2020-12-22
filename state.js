/**
 * GPGPU state and GL resources.
 *
 * @todo In-place updates of complex resources and meta info.
 * @todo Use transform feedback instead of data textures, if supported (WebGL2)?
 * @todo Consider class/object/data/function structure further.
 */

import range from '@epok.tech/fn-lists/range';
import map from '@epok.tech/fn-lists/map';
import reduce from '@epok.tech/fn-lists/reduce';
import isNumber from '@epok.tech/is-type/number';

import {
        scaleDef, stepsDef, valuesDef, channelsMinDef, typeDef
    } from './const';

/**
 * Set up the GPGPU resources and meta information for a state of a number data.
 *
 * @todo Transform feedback.
 * @todo Validation.
 * @todo Reorder the given `values` into the most efficient `maps`?
 *
 * @example
 *     const state = {
 *         steps: 2, maps: mapGroups({ values: [4, 2, 3], texturesMax: 4 })
 *     };
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
 *     Object.assign(state, {
 *         type: 'uint8', stepNow: 2,
 *         maps: mapGroups({ values: [4, 2, 3], texturesMax: 1 })
 *     });
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
 * @param {object} api The API for GL resources.
 * @param {function} api.texture A function to create a GL texture.
 * @param {function} api.framebuffer A function to create a GL framebuffer.
 * @param {object} [state={}] The state parameters.
 * @param {number} [state.radius] The length of the sides of the data textures
 *     to allocate. If given, supersedes the `state` `width`/`height`/`scale`.
 * @param {number} [state.width] The width of the data textures to allocate.
 *     If given, supersedes `state.scale`.
 * @param {number} [state.height] The height of the data textures to allocate.
 *     If given, supersedes `state.scale`.
 * @param {number} [state.scale=scaleDef] The length of the data textures sides
 *     to allocate; gives a square power-of-two texture raising 2 to this power.
 * @param {number|array} [state.steps=stepsDef] How many steps of state to
 *     track, or the list of states if already set up.
 * @param {object} [state.maps] How `state.maps.values` are grouped per-texture
 *     per-pass per-step. See `mapGroups`.
 * @param {array<number>} [state.maps.values=valuesDef()] How values of each
 *     data item may be grouped into textures across passes. Set up here if not
 *     given. See `mapGroups`.
 * @param {number} [state.maps.channelsMin=channelsMinDef] The minimum allowed
 *     channels for framebuffer attachments. Sets up unused channels as needed
 *     to reach this limit.
 * @param {number} [state.maps.textures] How values are grouped into textures.
 *     See `mapGroups`.
 * @param {string} [state.type=typeDef] The data type of the textures.
 * @param {number} [state.stepNow=-1] The currently active state step, if any.
 * @param {number} [state.passNow=-1] The currently active draw pass, if any.
 * @param {object} [out=state] The state object to set up. Modifies the given
 *     `state` object by default.
 *
 * @returns {object} `out` The state object, set up with the data resources and
 *     meta information, for step/draw later:
 * @returns {object<number,array<number,array<number>>>} `out.maps` Any given
 *     `state.maps`. See `mapGroups`.
 * @returns {array<array<object<api.texture,number,array<number>>>>}
 *     `out.textures` Textures per step, as arrays of objects of `api.texture`,
 *     and meta info. See `out.maps.textures`.
 * @returns {array<array<object<api.framebuffer,number,array<number>>>>}
 *     `out.passes` Passes per step, as arrays of objects of `api.framebuffer`,
 *     referencing `out.textures`, and meta info. See `out.maps.passes`.
 * @returns {array<api.framebuffer<array<api.texture>>>} `out.steps`
 *     Hierarchy of steps of state, as an array of `api.framebuffer` from
 *     `out.passes`, with arrays of `api.texture` from `out.textures`, and meta
 *     information; set up here, or the given `state.steps` if it was an array.
 *     State data may be drawn into the framebuffers accordingly.
 *     See `mapGroups` and `getStep`.
 * @returns {object<number,string,array<number>>} `out.size` Size/type
 *     information on data resources.
 * @returns {number} `out.stepNow` The currently active state step, as given.
 * @returns {number} `out.passNow` The currently active draw pass, as given.
 */
export function getState(api, state = {}, out = state) {
    // See usage here for what the API must implement.
    const { texture, framebuffer } = api;

    const {
            radius, width, height, scale = scaleDef, type = typeDef,
            steps = stepsDef, stepNow = -1, passNow = -1, maps
        } = state;

    out.maps = maps;
    out.stepNow = stepNow;
    out.passNow = passNow;

    const {
            values = valuesDef(),
            channelsMin = channelsMinDef, textures: texturesMap
        } = maps;

    maps.channelsMin = channelsMin;
    maps.values = values;

    const textureProps = {
        type, min: 'nearest', mag: 'nearest', wrap: 'clamp',
        // Passing `state.scale` ensures a power-of-two square texture size.
        width: (radius || width || 2**scale),
        height: (radius || height || 2**scale)
    };

    // Size of the created resources.
    const size = out.size = {
        ...textureProps, steps: ((isNumber(steps))? steps : steps.length),
        textures: 0, passes: 0,
        shape: [textureProps.width, textureProps.height],
        count: textureProps.width*textureProps.height
    };

    const textures = out.textures = [];
    const passes = out.passes = [];

    const addTexture = (step, pass, textureProps) => (index) =>
        ((textures[step] || (textures[step] = []))[index] = {
            // Meta info.
            step, pass, index, count: size.textures++, map: texturesMap[index],
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
                        texturesMap[t], max),
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

    // Set up resources we'll need to store data per-texture per-pass per-step.
    out.steps = map((passes, step) =>
            // Use any given passes or create a new list of them.
            (passes || map(addPass(step), maps.passes)),
        // Use any given steps or create a new list of them.
        ((isNumber(steps))? range(steps) : steps), 0);

    return out;
}

export default getState;
