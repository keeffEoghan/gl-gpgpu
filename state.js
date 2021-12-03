/**
 * GPGPU state and GL resources: framebuffers, textures; and meta information.
 *
 * @todo Allow passes into or across textures; separate data and texture shapes.
 * @todo In-place updates of complex resources and meta info.
 * @todo Use transform feedback instead of data textures, if supported (WebGL2)?
 */

import range from '@epok.tech/fn-lists/range';
import map from '@epok.tech/fn-lists/map';
import reduce from '@epok.tech/fn-lists/reduce';

import {
        scaleDef, stepsDef, valuesDef, channelsMinDef,
        typeDef, minDef, magDef, wrapDef, depthDef, stencilDef
    } from './const';

/**
 * Set up the GPGPU resources and meta information for a state of a number data.
 *
 * @todo Transform feedback.
 * @todo Reorder the given `values` into the most efficient `maps`?
 *
 * @example
 *     const api = {
 *         framebuffer: ({ depth, stencil, width, height, color }) => null,
 *         texture: ({ type, min, mag, wrap, width, height, channels }) => null
 *     };
 *
 *     // Example with `webgl_draw_buffers` extension support, for 4 buffers.
 *     let maps = mapGroups({ values: [1, 2, 3], texturesMax: 4, packed: 0 });
 *     let state = { steps: 2, side: 10, maps };
 *
 *     const s0 = getState(api, state, {}); // =>
 *     {
 *         ...state, passNow: undefined, stepNow: undefined,
 *         size: {
 *             steps: 2, passes: 2, textures: 4,
 *             width: 10, height: 10, shape: [10, 10], count: 100
 *         },
 *         steps: [
 *             [s0.passes[0][0].framebuffer], [s0.passes[1][0].framebuffer]
 *         ],
 *         // This setup results in fewer passes, as more buffers can be bound.
 *         passes: [
 *             [
 *                 {
 *                     framebuffer: api.framebuffer(s0.passes[0][0]),
 *                     color: [
 *                         s0.textures[0][0].texture, s0.textures[0][1].texture
 *                     ],
 *                     map: [0, 1], // maps.passes[0]
 *                     entry: 0, index: 0, step: 0,
 *                     depth: false, stencil: false, width: 10, height: 10
 *                 }
 *             ],
 *             [
 *                 {
 *                     framebuffer: api.framebuffer(s0.passes[1][0]),
 *                     color: [
 *                         s0.textures[1][0].texture, s0.textures[1][1].texture
 *                     ],
 *                     map: [0, 1], // maps.passes[0]
 *                     entry: 1, index: 0, step: 1,
 *                     depth: false, stencil: false, width: 10, height: 10
 *                 }
 *             ]
 *         ],
 *         textures: [
 *             [
 *                 {
 *                     texture: api.texture(s0.textures[0][0]),
 *                     map: [0, 1], // maps.textures[0]
 *                     entry: 0, index: 0, step: 0, pass: 0,
 *                     type: 'float', width: 10, height: 10, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 },
 *                 {
 *                     texture: api.texture(s0.textures[0][1]),
 *                     map: [2], // maps.textures[1]
 *                     entry: 1, index: 1, step: 0, pass: 0,
 *                     type: 'float', width: 10, height: 10, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 }
 *             ],
 *             [
 *                 {
 *                     texture: api.texture(s0.textures[1][0]),
 *                     map: [0, 1], // maps.textures[0]
 *                     entry: 2, index: 0, step: 1, pass: 0,
 *                     type: 'float', width: 10, height: 10, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 },
 *                 {
 *                     texture: api.texture(s0.textures[1][1]),
 *                     map: [2], // maps.textures[1]
 *                     entry: 3, index: 1, step: 1, pass: 0,
 *                     type: 'float', width: 10, height: 10, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 }
 *             ]
 *         ]
 *     };
 *
 *     // Example with no `webgl_draw_buffers` extension support, only 1 buffer.
 *     maps = mapGroups({ values: [1, 2, 3], texturesMax: 1, packed: 0 });
 *     state = { type: 'uint8', steps: 2, scale: 5, maps, stepNow: 1 };
 *
 *     const s1 = getState(api, state, {}); // =>
 *     {
 *         ...state, passNow: undefined, stepNow: 1,
 *         size: {
 *             steps: 2, passes: 4, textures: 4,
 *             width: 32, height: 32, shape: [32, 32], count: 1024
 *         },
 *         steps: [
 *             [s1.passes[0][0].framebuffer, s1.passes[0][1].framebuffer],
 *             [s1.passes[1][0].framebuffer, s1.passes[1][1].framebuffer]
 *         ],
 *         // This setup results in more passes, as fewer buffers can be bound.
 *         passes: [
 *             [
 *                 {
 *                     framebuffer: api.framebuffer(s1.passes[0][0]),
 *                     color: [s1.textures[0][0].texture],
 *                     map: [0], // maps.passes[0]
 *                     entry: 0, index: 0, step: 0,
 *                     depth: false, stencil: false, width: 32, height: 32
 *                 },
 *                 {
 *                     framebuffer: api.framebuffer(s1.passes[0][1]),
 *                     color: [s1.textures[0][1].texture],
 *                     map: [1], // maps.passes[1]
 *                     entry: 1, index: 1, step: 0,
 *                     depth: false, stencil: false, width: 32, height: 32
 *                 }
 *             ],
 *             [
 *                 {
 *                     framebuffer: api.framebuffer(s1.passes[1][0]),
 *                     color: [s1.textures[1][0].texture],
 *                     map: [0], // maps.passes[0]
 *                     entry: 2, index: 0, step: 1,
 *                     depth: false, stencil: false, width: 32, height: 32
 *                 },
 *                 {
 *                     framebuffer: api.framebuffer(s1.passes[1][1]),
 *                     color: [s1.textures[1][1].texture],
 *                     map: [1], // maps.passes[1]
 *                     entry: 3, index: 1, step: 1,
 *                     depth: false, stencil: false, width: 32, height: 32
 *                 }
 *             ]
 *         ],
 *         textures: [
 *             [
 *                 {
 *                     texture: api.texture(s1.textures[0][0]),
 *                     map: [0, 1], // maps.textures[0]
 *                     entry: 0, index: 0, step: 0, pass: 0,
 *                     type: 'uint8', width: 32, height: 32, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 },
 *                 {
 *                     texture: api.texture(s1.textures[0][1]),
 *                     map: [2], // maps.textures[1]
 *                     entry: 1, index: 1, step: 0, pass: 1,
 *                     type: 'uint8', width: 32, height: 32, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 }
 *             ],
 *             [
 *                 {
 *                     texture: api.texture(s1.textures[1][0]),
 *                     map: [0, 1], // maps.textures[0]
 *                     entry: 2, index: 0, step: 1, pass: 0,
 *                     type: 'uint8', width: 32, height: 32, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 },
 *                 {
 *                     texture: api.texture(s1.textures[1][1]),
 *                     map: [2], // maps.textures[1]
 *                     entry: 3, index: 1, step: 1, pass: 1,
 *                     type: 'uint8', width: 32, height: 32, channels: 4,
 *                     min: 'nearest', mag: 'nearest', wrap: 'clamp'
 *                 }
 *             ]
 *         ]
 *     };
 *
 * @see texture
 * @see framebuffer
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [mapSamples]{@link ./maps.js#mapSamples}
 * @see [getStep]{@link ./step.js#getStep}
 * @see [macroPass]{@link ./macros.js#macroPass}
 *
 * @param {object} api The API for GL resources.
 * @param {texture} [api.texture] Function to create a GL texture.
 * @param {framebuffer} [api.framebuffer] Function to create a GL framebuffer.
 * @param {object} [state={}] The state parameters.
 * @param {number} [state.width] The width of the data textures to allocate;
 *     if given, supersedes `state.side` and `state.scale`.
 * @param {number} [state.height] The height of the data textures to allocate;
 *     if given, supersedes `state.side` and `state.scale`.
 * @param {number} [state.side] The length of both sides of the data textures
 *     to allocate; if given, supersedes `state.scale`.
 * @param {number} [state.scale=scaleDef] The length of the data textures sides
 *     to allocate; gives a square power-of-two texture raising 2 to this power.
 * @param {number|array} [state.steps=stepsDef] How many steps of state to
 *     track, or the list of states if already set up.
 * @param {object} [state.maps] How `state.maps.values` are grouped per-texture
 *     per-pass per-step. See `mapGroups`.
 * @param {array<number>} [state.maps.values=valuesDef()] How values of each
 *     data item may be grouped into textures across passes; set up here if not
 *     given. See `mapGroups`.
 * @param {number} [state.maps.channelsMin=channelsMinDef] The minimum allowed
 *     channels for framebuffer attachments; allocates unused channels as needed
 *     to reach this limit.
 * @param {number} [state.maps.textures] How values are grouped into textures.
 *     See `mapGroups`.
 * @param {number} [state.stepNow] The currently active state step, if any.
 * @param {number} [state.passNow] The currently active draw pass, if any.
 * @param {string} [state.type=typeDef] Texture data type.
 * @param {string} [state.min=minDef] Texture minification filter.
 * @param {string} [state.mag=magDef] Texture magnification filter.
 * @param {string} [state.wrap=wrapDef] Texture wrap mode.
 * @param {boolean|*} [state.depth=depthDef] Framebuffer depth attachment.
 * @param {boolean|*} [state.stencil=stencilDef] Framebuffer stencil attachment.
 * @param {object} [to=state] The state object to set up. Modifies the given
 *     `state` object by default.
 *
 * @returns {object} `to` The state object, set up with the data resources and
 *     meta information, for use with `getStep` and drawing:
 * @returns {object<number,array<number,array<number>>>} `to.maps` Any given
 *     `state.maps`. See `mapGroups`.
 * @returns {array<array<object<texture,string,number,array<number>>>>}
 *     `to.textures` Textures per step, as arrays of objects of `texture`s, and
 *     meta info. See `to.maps.textures`.
 * @returns {array<array<object<framebuffer,number,array<number>>>>}
 *     `to.passes` Passes per step, as arrays of objects of `framebuffer`s,
 *     referencing `to.textures`, and meta info. See `to.maps.passes`.
 * @returns {array<framebuffer<array<texture>>>} `to.steps`
 *     Hierarchy of steps of state, as an array of `framebuffer`s from
 *     `to.passes`, with arrays of `texture`s from `to.textures`, and meta
 *     information; set up here, or the given `state.steps` if it's an array.
 *     State data may be drawn into the framebuffers accordingly.
 *     See `mapGroups` and `getStep`.
 * @returns {object<number,string,array<number>>} `to.size` Size/type
 *     information about the created data resources.
 * @returns {number} `to.stepNow` The currently active state step, as given.
 * @returns {number} `to.passNow` The currently active draw pass, as given.
 */
export function getState({ texture, framebuffer }, state = {}, to = state) {
    const {
            steps = stepsDef, stepNow, passNow, maps, side, scale = scaleDef,
            // Just `state.scale` ensures square power-of-two; for e.g: mipmaps.
            width = (side ?? 2**scale), height = (side ?? 2**scale),
            // Resource format settings.
            type = typeDef, min = minDef, mag = magDef, wrap = wrapDef,
            depth = depthDef, stencil = stencilDef
        } = state;

    to.maps = maps;
    to.stepNow = stepNow;
    to.passNow = passNow;

    const {
            values = valuesDef(),
            channelsMin = channelsMinDef, textures: texturesMap
        } = maps;

    maps.channelsMin = channelsMin;
    maps.values = values;

    // Size of the created resources.
    const size = to.size = {
        steps: (steps.length ?? steps), textures: 0, passes: 0,
        width, height, shape: [width, height], count: width*height
    };

    const textures = to.textures = [];
    const passes = to.passes = [];

    const addTexture = (step, pass, props) => (index) =>
        ((textures[step] ??= [])[index] = {
            // Meta info.
            ...props,
            entry: size.textures++, step, pass, index, map: texturesMap[index],
            // Resources.
            texture: texture?.(props)
        })
        .texture;

    const addPass = (step) => (pass, index) => {
        // All framebuffer color attachments need the same number of channels.
        const textureProps = {
            type, min, mag, wrap, width, height,
            channels: reduce((max, t) =>
                    reduce((max, v) => Math.max(max, values[v]),
                        texturesMap[t], max),
                pass, channelsMin)
        };

        const textures = map(addTexture(step, index, textureProps), pass);
        const props = { depth, stencil, width, height, color: textures };

        return ((passes[step] ??= [])[index] = {
                // Meta info.
                ...props, entry: size.passes++, step, index, map: pass,
                // Resources.
                framebuffer: framebuffer?.(props)
            })
            .framebuffer;
    };

    // Set up resources we'll need to store data per-texture per-pass per-step.
    to.steps = map((passes, step) =>
            // Use any given passes or create a new list of them.
            (passes || map(addPass(step), maps.passes)),
        // Use any given steps or create a new list of them.
        ((Number.isFinite(steps))? range(steps) : steps), 0);

    return to;
}

/**
 * Function to create a GL texture.
 *
 * @callback texture
 *
 * @param {string} type
 * @param {string} min
 * @param {string} mag
 * @param {string} wrap
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 *
 * @returns {*} A GL texture, or an object serving that purpose.
 */

/**
 * Function to create a GL framebuffer.
 *
 * @callback framebuffer
 *
 * @param {boolean} depth
 * @param {boolean} stencil
 * @param {number} width
 * @param {number} height
 * @param {array<texture>} color
 *
 * @returns {*} A GL framebuffer, or an object serving that purpose.
 */

export default getState;
