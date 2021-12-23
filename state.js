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

import { getWidth, getHeight, getScaled } from './size';

import {
        widthDef, heightDef, scaleDef, stepsDef, valuesDef, channelsMinDef,
        typeDef, minDef, magDef, wrapDef, depthDef, stencilDef, mergeDef
    } from './const';

const { isInteger } = Number;

/**
 * Set up the GPGPU resources and meta information for a state of a number data.
 *
 * @example
 *     const api = {
 *         framebuffer: ({ depth, stencil, width, height, color }) => null,
 *         texture: ({ type, min, mag, wrap, width, height, channels }) => null
 *     };
 *
 *     // Example with `webgl_draw_buffers` extension support, for 4 buffers.
 *     let maps = mapGroups({ values: [1, 2, 3], buffersMax: 4, packed: 0 });
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
 *     maps = mapGroups({ values: [1, 2, 3], buffersMax: 1, packed: 0 });
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
 * @see [macroSamples]{@link ./macros.js#macroSamples}
 * @see [macroTaps]{@link ./macros.js#macroTaps}
 * @see [macroPass]{@link ./macros.js#macroPass}
 * @see [getWidth]{@link ./size.js#getWidth}
 * @see [getHeight]{@link ./size.js#getHeight}
 * @see [getScaled]{@link ./size.js#getScaled}
 *
 * @see https://stackoverflow.com/a/60110986/716898
 * @see https://github.com/WebGLSamples/WebGL2Samples/blob/master/samples/texture_2d_array.html
 * @see https://github.com/WebGLSamples/WebGL2Samples/blob/master/samples/texture_3d.html
 *
 * @param {object} api The API for GL resources.
 * @param {texture} [api.texture] Function to create a GL texture.
 * @param {framebuffer} [api.framebuffer] Function to create a GL framebuffer.
 * @param {object} [state={}] The state parameters.
 *
 * @param {number} [state.width=widthDef] Data width, aliases follow in order
 *     of precedence. See `getWidth`.
 * @param {number} [state.w] Alias of `state.width`. See `getWidth`.
 * @param {number} [state.x] Alias of `state.width`. See `getWidth`.
 * @param {number} [state.height=heightDef] Data height, aliases follow in order
 *     of precedence. See `getHeight`.
 * @param {number} [state.h] Alias of `state.height`. See `getHeight`.
 * @param {number} [state.y] Alias of `state.height`. See `getHeight`.
 * @param {number} [state.shape] Data size. See `getWidth` and `getHeight`.
 * @param {number} [state.size] Data size. See `getWidth` and `getHeight`.
 * @param {number} [state.side] Data size of width/height.
 *     See `getWidth` and `getHeight`.
 * @param {number} [state.0] Alias of `state.width` (index 0). See `getWidth`.
 * @param {number} [state.1] Alias of `state.height` (index 1). See `getHeight`.
 * @param {number} [state.scale=scaleDef] Data size of width/height as a square
 *     power-of-two size, 2 raised to this power. See `getScaled`.
 *
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
 *
 * @param {boolean|*} [state.merge=mergeDef] Whether to merge states into one
 *     texture; `true` handles merging here; any other truthy is used as-is (the
 *     merged texture already set up); falsey uses un-merged arrays of textures.
 *     Merging allows shaders to access past steps by non-constant lookups; e.g:
 *     attributes cause "sampler array index must be a literal expression" on
 *     GLSL3 spec and some platforms (e.g: D3D); but takes more work to copy the
 *     last pass's bound texture/s to merge into the past texture, so should be
 *     used to variably access past steps or avoid arrays of textures limits.
 *     Only this merged past texture and those bound in an active pass are
 *     created, as upon each pass the output will be copied to the past texture,
 *     and bound textures reused in the next pass.
 *     If not merging, all state is as output by its pass in its own one of the
 *     arrays of textures.
 *     The default merged texture is laid out as `[texture, step]` on the
 *     `[x, y]` axes, respectively; if other layouts are needed, the merge
 *     texture can be given here to be used as-is, and the merging/copying and
 *     lookup logic in their respective hooks. See `getStep` and `macroTaps`.
 *     If a merge texture is given, size information is interpreted in a similar
 *     way and precedence as it is from `state`. See `getWidth` and `getHeight`.
 * @param {number} [state.merge.width] Merged data width, aliases follow in
 *     order of precedence. See `state`.
 * @param {number} [state.merge.w] Alias of `state.merge.width`. See `state`.
 * @param {number} [state.merge.x] Alias of `state.merge.width`. See `state`.
 * @param {number} [state.merge.height] Merged data height, aliases follow in
 *     order of precedence. See `state`.
 * @param {number} [state.merge.h] Alias of `state.merge.height`. See `state`.
 * @param {number} [state.merge.y] Alias of `state.merge.height`. See `state`.
 * @param {number} [state.merge.shape] Merged data size. See `state`.
 * @param {number} [state.merge.size] Merged data size. See `state`.
 * @param {number} [state.merge.side] Merged data size of width/height.
 *     See `state`.
 * @param {number} [state.merge.0] Alias of `state.merge.width` (index 0).
 *     See `state`.
 * @param {number} [state.merge.1] Alias of `state.merge.height` (index 1).
 *     See `state`.
 * @param {number} [state.merge.scale] Merged data size of width/height as a
 *     square power-of-two size, 2 raised to this power. See `state`.
 *
 * @param {object} [to=state] The state object to set up. Modifies the given
 *     `state` object by default.
 *
 * @returns {object} `to` The state object, set up with the data resources and
 *     meta information, for use with `getStep` and drawing:
 * @returns {object<number,array<number,array<number>>>} `to.maps` Any given
 *     `state.maps`. See `mapGroups`.
 * @returns {array<array<object<texture,string,number,array<number>>>>}
 *     `to.textures` Textures per step, as arrays of objects of `texture`s and
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
 * @returns {undefined|*|object<texture,string,number,array<number>>} `to.merge`
 *     Any created object of a merged `texture` and meta info, or the given
 *     `state.merge` as-is if not handled here. See `getStep` and `macroTaps`.
 * @returns {object} `to.size` Size/type information of the created resources.
 * @returns {string} `to.size.type` Data type of `framebuffer`s and `texture`s.
 * @returns {boolean} `to.size.depth` Whether `framebuffer`s attach depth.
 * @returns {boolean} `to.size.stencil` Whether `framebuffer`s attach stencil.
 * @returns {number} `to.size.channelsMin` Minimum channels in any `texture`.
 * @returns {number} `to.size.steps` Number of `to.steps` in the main flow.
 * @returns {number} `to.size.passes` Number of `to.passes` in `to.steps`.
 * @returns {number} `to.size.framebuffers` Number of `framebuffer`s created.
 * @returns {number} `to.size.textures` Number of `to.textures` in `to.passes`.
 * @returns {number} `to.size.colors` Number of `texture`s created.
 * @returns {number} `to.size.width` Width of `framebuffer`s and `texture`s.
 * @returns {number} `to.size.height` Height of `framebuffer`s and `texture`s.
 * @returns {array<number>} `to.size.shape` Shape of `framebuffer`s and
 *     `texture`s, as `[to.size.width, to.size.height]`.
 * @returns {number} `to.size.count` Number of entries in each `texture`.
 * @returns {undefined|object<number,string,array<number>>} `to.size.merge`
 *     Size/type information about any created or given merge texture.
 * @returns {number} `to.stepNow` The currently active state step, as given.
 * @returns {number} `to.passNow` The currently active draw pass, as given.
 */
export function getState({ texture, framebuffer }, state = {}, to = state) {
    const {
            steps = stepsDef, stepNow, passNow, maps, merge = mergeDef, scale,
            // Resource format settings.
            type = typeDef, min = minDef, mag = magDef, wrap = wrapDef,
            depth = depthDef, stencil = stencilDef
        } = state;

    const scaled = getScaled(scale);
    const width = getWidth(state) ?? scaled ?? widthDef;
    const height = getHeight(state) ?? scaled ?? heightDef;

    to.maps = maps;
    to.stepNow = stepNow;
    to.passNow = passNow;

    const {
            values = valuesDef(),
            channelsMin = channelsMinDef, textures: texturesMap
        } = maps;

    maps.channelsMin = channelsMin;
    maps.values = values;

    // All framebuffer attachments need the same number of channels; enough to
    // hold all values a pass holds, or all passes hold if merging and reusing.
    const passChannels = (pass, min) => reduce((min, t) =>
            Math.max(min, reduce((sum, v) => sum+values[v], texturesMap[t], 0)),
        pass, min);

    // If merging past textures and reusing texture attachments in each pass's
    // framebuffer, pre-compute the minimum channels for a reusable pool of
    // texture attachments that can hold any pass's values; since all a
    // framebuffer's attachments also need the same number of channels, this is
    // also the same number of channels across all passes.
    const mergeChannels = ((!merge)? null
        :   reduce((min, p) => passChannels(p, min), maps.passes, channelsMin));

    // Size of the created resources.
    const size = to.size = {
        type, depth, stencil, channelsMin: (mergeChannels ?? channelsMin),
        steps: (steps.length ?? steps),
        passes: 0, framebuffers: 0, textures: 0, colors: 0,
        width, height, shape: [width, height], count: width*height
    };

    /** The textures created for the `step`/`pass` render flow. */
    const textures = to.textures = [];
    /** The passes created for the `step`/`pass` render flow. */
    const passes = to.passes = [];
    /** The textures bound to the next pass; reused if merging. */
    let colorPool;

    /**
     * Add a texture attachment and meta info to `textures` if applicable; to
     * return its new `texture` or a reused one to bind to a pass in `passes`.
     */
    const addTexture = (channels, w, h, step, pass) => (index, c, _, color) => {
        /** Properties passed for texture creation, then meta info. */
        const to = { channels, width: w, height: h, type, min, mag, wrap };

        // Resources.

        // Add/reuse texture color attachments as needed; add minimal textures.
        // If merging, passes may reuse any pass's existing texture attachments;
        // otherwise, each pass has its own dedicated texture attachments.
        let entry = c;
        let t = color?.[entry];

        // Only create new textures if existing ones can't be reused.
        if(!t) {
            t = texture?.(to);
            entry = size.textures++;
        }

        // Add meta info.

        /** Check if this is bound to a pass. */
        const bind = (isInteger(pass) || null);

        /** Denotes attached texture; if merging, textures are reused. */
        to.texture = t;
        /** Denotes attached texture entry; if merging, textures are reused. */
        to.entry = entry;
        /** Denotes framebuffer attachments; may reuse underlying textures. */
        to.color = (bind && size.colors++);
        to.step = step;
        to.pass = pass;
        to.index = index;
        to.map = texturesMap[index];

        // Check whether this texture is part of the `step`/`pass` render flow.
        // If not, return the entire object.
        return ((!(bind && isInteger(step) && isInteger(index)))? to
            // If so, add to `textures`, return its `texture` to bind to a pass.
            :   ((textures[step] ??= [])[index] = to).texture);
    };

    /**
     * Add a pass to `passes`, with its `textures` bound; to return its
     * `framebuffer` to one of `steps`.
     */
    const addPass = (step, color) => (pass, index) => {
        /**
         * All a framebuffer's attachments need the same number of channels;
         * ignored if a `color`'s given as it'll be defined there instead.
         */
        const channels = (color ?? mergeChannels ??
            ((pass)? passChannels(pass, channelsMin) : channelsMin));

        // Resources.

        /** Map the pass's texture color attachments and their meta info. */
        color ??= map(addTexture(channels, width, height, step, index), pass,
            // Reuse any existing color attachments if merging; otherwise create
            // dedicated color attachments for each pass.
            ((merge)? (colorPool ??= []) : []));

        /** Properties passed for framebuffer creation, then meta info. */
        const to = { depth, stencil, width, height, color };

        /** The framebuffer for this pass. */
        to.framebuffer = framebuffer?.(to);

        // Add meta info.

        /** Denotes attached texture entry; if merging, textures are reused. */
        to.entry = size.framebuffers++;
        /** Denotes framebuffer attachments; . */
        to.pass = (pass && size.passes++);
        to.step = step;
        to.index = index;
        to.map = pass;

        // Check whether this pass is part of the `step`/`pass` render flow.
        // If not, return the entire object.
        return ((!(pass && isInteger(step) && isInteger(index)))? to
            // If so, add to `passes`, return its `framebuffer` for its step.
            :   ((passes[step] ??= [])[index] = to).framebuffer);
    };

    // Set up resources we'll need to store data per-texture per-pass per-step.
    to.steps = map((passes, step) =>
            // Use any given passes or create a new list.
            (passes || map(addPass(step), maps.passes)),
        // Use any given steps or create a new list.
        ((isInteger(steps))? range(steps) : steps), 0);

    // Finish here if merge is disabled.
    if(!merge) { return to; }

    // Set up the texture for states to be merged into.

    // Use any size info available in `merge`, as with `state` above.
    const mScaled = getScaled(merge.scale);
    // Use any given size info, or arrange merges along `[texture, step]` axes.
    const mw = getWidth(merge) ?? mScaled ?? maps.textures.length*width;
    const mh = getHeight(merge) ?? mScaled ?? size.steps*height;

    // New merge texture and info, or use any given merge texture.
    (to.merge = ((merge === true)? addTexture(mergeChannels, mw, mh)() : merge))
        // Empty framebuffer, to copy data from each texture of each pass.
        .copier ??= addPass(null, false)();

    size.merge = { width: mw, height: mh, shape: [mw, mh], count: mw*mh };

    return to;
}

/**
 * Function to create a GL texture; from a GL API.
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
 * Function to create a GL framebuffer; from a GL API.
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
