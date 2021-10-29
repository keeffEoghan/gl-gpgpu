/**
 * GPGPU mappings for step/draw shaders input/output.
 *
 * These maps show shaders how to make use of a system's supported features, how
 * to pack/unpack their data with framebuffers/textures, perform only the needed
 * texture samples to retrieve any past values they must derive from, etc.
 * Shaders may declare values they output, values they derive from, groupings of
 * in/dependent values - without handling how these concerns map to the
 * particular system resources they're using.
 * System limits/features/extensions are accounted for, to produce the most
 * efficient mappings available with the least I/O when it comes to drawing
 * (draw passes, texture samples, etc).
 *
 * @todo Check `packValues` optional and/or based on the given `derives` work.
 * @todo Check examples are correct.
 */

import map from '@epok.tech/fn-lists/map';
import reduce from '@epok.tech/fn-lists/reduce';
import each from '@epok.tech/fn-lists/each';

import { valuesDef, channelsMaxDef, texturesMaxDef } from './const';

export const cache = { packed: [] };

export const validValue = (value, channelsMax = channelsMaxDef) =>
    (((1 <= value) && (value <= channelsMax)) ||
        !!console.error(`\`gl-gpgpu\`: the given value (${value}) exceeds the `+
            `range of channels available (1 to ${channelsMax}).`,
            value, channelsMax));

/**
 * Minimise resource usage, order `values` to pack into blocks of `channelsMax`.
 *
 * @see mapGroups
 *
 * @param {array<number>} values Each entry is how many co-dependent channels
 *     are grouped into one texture in one pass, separate entries may be in one
 *     or more textures/passes. See `mapGroups`.
 * @param {number} [channelsMax=channelsMaxDef] The maximum number of channels
 *     per texture. See `mapGroups`.
 * @param {array} [out=[]] An array to store the result; a new array by default.
 *
 * @returns {array<number>} `out` The indexes of the given `values`, reordered
 *     to pack into the fewest buckets of `channelsMax` size or less; stored in
 *     the given `out` array.
 */
export function packValues(values, channelsMax = channelsMaxDef, out = []) {
    out.length = values.length;
    map((_, i) => i, values, out);

    // Counts the number of empty channels in the current group.
    let channels = channelsMax;
    // How many values have already been packed.
    let packed = 0;
    // Tracks the value that best fits the free channels (fills it tightest).
    let fitIndex = 0;
    let fitSize = Infinity;

    for(let i = 0; packed < values.length;) {
        const v = packed+i;
        const value = values[out[v]];

        if(!validValue(value, channelsMax)) { return out; }

        // Check how value fits the channels - valid is >= 0, perfect is 0.
        const fit = channels-value;

        if((fit >= 0) && (fit < fitSize)) {
            fitSize = fit;
            fitIndex = v;
        }

        if((fitSize !== 0) && (v < values.length-1)) { ++i; }
        else {
            // Got a perfect fit or the search ended - swap in best fit value.
            const pack = out[fitIndex];

            out[fitIndex] = out[packed];
            out[packed] = pack;

            // Reduce the free channels by the best value, reset if needed.
            (((channels -= values[pack]) > 0) || (channels = channelsMax));
            // Start the search again over the remaining unpacked entries.
            fitIndex = ++packed;
            fitSize = Infinity;
            i = 0;
        }
    }

    return out;
}

/**
 * Groups the `values` of GPGPU data items across draw passes and data textures.
 *
 * @todo Now `values` may be packed first into buckets of `channelsMax` tightly
 *     before mapping, check whether the examples are correct.
 *
 * @example
 *     mapGroups({ values: [2, 4, 1], channelsMax: 4, texturesMax: 1 }); // =>
 *     {
 *         values: [2, 4, 1],
 *         textures: [[0], [1], [2]], // length === 3
 *         passes: [[0], [1], [2]], // length === 3
 *         texturesMax: 1,
 *         channelsMax: 4,
 *         valueToTexture: [0, 1, 2],
 *         valueToPass: [0, 1, 2],
 *         textureToPass: [0, 1, 2]
 *     };
 *
 *     mapGroups({ values: [4, 2, 1], texturesMax: 1 }); // =>
 *     {
 *         values: [4, 2, 1],
 *         textures: [[0], [1, 2]], // length === 2
 *         passes: [[0], [1]], // length === 2
 *         texturesMax: 1,
 *         channelsMax: 4,
 *         valueToTexture: [0, 1, 1],
 *         valueToPass: [0, 1, 1],
 *         textureToPass: [0, 1]
 *     };
 *
 *     mapGroups({ values: [4, 2, 1], texturesMax: 4 }); // =>
 *     {
 *         values: [4, 2, 1],
 *         textures: [[0], [1, 2]], // length === 2
 *         passes: [[0, 1]], // length === 1
 *         texturesMax: 4,
 *         channelsMax: 4,
 *         valueToTexture: [0, 1, 1],
 *         valueToPass: [0, 0, 0],
 *         textureToPass: [0, 0]
 *     };
 *
 *     mapGroups({ values: [2, 4, 1], texturesMax: 4 }); // =>
 *     {
 *         values: [2, 4, 1],
 *         textures: [[0], [1], [2]], // length === 3
 *         passes: [[0, 1, 2]], // length === 1
 *         texturesMax: 4,
 *         channelsMax: 4,
 *         valueToTexture: [0, 1, 2],
 *         valueToPass: [0, 0, 0],
 *         textureToPass: [0, 0, 0]
 *     };
 *
 *     mapGroups({ values: [2, 4, 1, 2], texturesMax: 2 }); // =>
 *     {
 *         values: [2, 4, 1, 2],
 *         textures: [[0], [1], [2, 3]], // length === 3
 *         passes: [[0, 1], [2]], // length === 2
 *         texturesMax: 2,
 *         channelsMax: 4,
 *         valueToTexture: [0, 1, 2, 2],
 *         valueToPass: [0, 0, 1, 1],
 *         textureToPass: [0, 0, 1]
 *     };
 *
 * @see packValues
 *
 * @export
 * @param {object} [maps={}] The maps. A new object if not given.
 * @param {array<number>} [maps.values=valuesDef()] An array where each number
 *     denotes how many value channels are grouped into one data texture in one
 *     draw pass; each separate number may be drawn across one or more data
 *     textures/passes. Each value denotes the number of dependent channels to
 *     be drawn together; separate values denote channels that aren't dependent,
 *     and may be drawn in the same or a separate pass, depending on device
 *     support. The given order is (currently) maintained, and may affect the
 *     number of passes/textures used. Where the next state depends on previous
 *     states, these should ideally be an entry of `channels` or less, for
 *     fewest texture reads to retrieve previous states.
 * @param {number} [maps.channelsMax=channelsMaxDef] Maximum channels per
 *     texture.
 * @param {number} [maps.texturesMax=texturesMaxDef] Maximum textures bound per
 *     pass.
 * @param {array<number>|falsey} [maps.packed] An array of indexes into `values`
 *     packed into an order that best fits into blocks of `channelsMax` to
 *     minimise resources; or `falsey` to use `values` in their given order;
 *     uses `packValues` if not given.
 * @param {object} [out=maps] An object to contain the results; modifies `maps`
 *     if not given.
 *
 * @returns {object} `out` The given `out` object; how `values` are grouped
 *     per-texture per-pass per-step, meta information, and given parameters.
 * @returns {array<array<number>>} `out.passes` Textures grouped into passes;
 *     arrays corresponding to framebuffers in separate draw passes; whose
 *     values are indexes into `out.textures`.
 * @returns {array<array<number>>} `out.textures` Values grouped into
 *     textures; arrays corresponding to framebuffer attachments, into which
 *     `values` are drawn; whose values are indexes into `out.values`.
 * @returns {array<number>} `out.values` The `values`, as given.
 * @returns {number} `out.texturesMax` The max textures per pass, as given.
 * @returns {number} `out.channelsMax` The max channels per texture, as given.
 * @returns {array<number>} `out.valueToTexture` Inverse map from each index of
 *     `out.values` to the index of the data texture containing it.
 * @returns {array<number>} `out.valueToPass` Inverse map from each index of
 *     `out.values` to the index of the pass containing it.
 * @returns {array<number>} `out.textureToPass` Inverse map from each index of
 *     `out.textures` to the index of the pass containing it.
 */
export function mapGroups(maps = {}, out = maps) {
    const {
            values = valuesDef(),
            channelsMax = channelsMaxDef, texturesMax = texturesMaxDef,
            // Pack `values` into blocks of `channelsMax` to minimise resources.
            packed = packValues(values, channelsMax, cache.packed)
        } = maps;

    out.values = values;
    out.texturesMax = texturesMax;
    out.channelsMax = channelsMax;
    out.passes = [[]];
    out.textures = [[]];
    out.valueToTexture = [];
    out.valueToPass = [];
    out.textureToPass = [];

    // Counts the number of channels written in a single draw pass.
    let channels = 0;
    // Get the value, via `packed` if valid, or directly as given in `values`.
    const getValue = ((packed)? (v) => values[v] : (v) => v);

    return reduce((out, v) => {
            const value = getValue(v);

            if(!validValue(value, channelsMax)) { return out; }

            const {
                    textures, passes, valueToTexture, valueToPass, textureToPass
                } = out;

            let p = passes.length-1;
            let pass = passes[p];
            let t = textures.length-1;
            let texture = textures[t];

            if((channels += value) > channelsMax) {
                channels = value;
                t = textures.push(texture = [])-1;

                ((pass.length >= texturesMax) &&
                    (p = passes.push(pass = [])-1));

                pass.push(t);
                textureToPass.push(p);
            }
            else if(pass.length === 0) {
                pass.push(t);
                textureToPass.push(p);
            }

            texture.push(v);
            valueToTexture.push(t);
            valueToPass.push(p);

            return out;
        },
        (packed || values), out);
}

/**
 * Maps the minimal set of texture reads to derive the next state of values from
 * a past state of values they depend upon.
 *
 * @example
 *     const maps = mapGroups({
 *         values: [2, 4, 1, 2], channelsMax: 4, texturesMax: 2,
 *         // Entries per-value of derived step/value indexes, entries include:
 *         // empty, single, multiple, and defined step samples.
 *         derives: [[1, 0], , [3, [1, 0]], [2]]
 *     });
 *
 *     mapSamples(maps); // =>
 *     {
 *         ...maps,
 *         // Per-pass, minimum texture samples for values.
 *         samples: [
 *             // Per-value - step/texture index pairs into `maps.textures`.
 *             [[0, 1], [0, 0]],
 *             [[0, 2], [1, 0]]
 *         ],
 *         // Per-pass, value indexes to texture samples.
 *         reads: [
 *             // Per-value - indexes into `out.samples`.
 *             [[0, 1], , , ],
 *             [, , [0, 1], [0]]
 *         ]
 *     };
 *
 * @see mapGroups
 *
 * @export
 * @param {object} maps How values are grouped per-texture per-pass per-step.
 *     See `mapGroups`.
 * @param {array<null,array<number,array<number>>>} [maps.derives] How values
 *     are derived. For each value index, a list of indexes of any past values
 *     it derives its from - a value not derived from past values may have an
 *     empty/null entry; a value derives from past values where its entry has:
 *     - Numbers; deriving from the most recent state at the given value index.
 *     - Lists of numbers; deriving from the given past state index (1st number
 *         denotes how many states ago), at the given value index (2nd number).
 *     If not given, no samples are mapped and `out` is returned unchanged.
 * @param {array<array<number>>} maps.passes Textures grouped into passes. See
 *     `mapGroups`.
 * @param {array<array<number>>} maps.textures Values grouped into textures. See
 *     `mapGroups`.
 * @param {array<number>} maps.valueToTexture Inverse map from each value index
 *     to the data texture index containing it.
 * @param {object} [out=maps] The object to store the result in; `maps` if not
 *     given.
 *
 * @returns {object} `out` The given `out` object, with resulting maps added if
 *     `maps.derives` were provided.
 * @returns {array<array<array<number>>>} `[out.samples]` Map of the minimum
 *     set of indexes into `maps.textures` that need to be sampled per-pass,
 *     to get all `derives` needed for each value of `maps.values` of each
 *     pass of `maps.passes`.
 * @returns {array<array<null,array<number>>>} `[out.reads]` Sparse map from
 *     each value of `derives` to its step and texture indexes in `out.samples`.
 * @returns {array<null,array<number,array<number>>>} `[out.derives]` How
 *     values are derived, as given.
 */
export function mapSamples(maps, out = maps) {
    const { derives, passes, textures, valueToTexture } = maps;

    if(!derives) { return out; }

    out.derives = derives;

    const reads = out.reads = [];

    const getAddSample = (set, pass, value) => (derive, d) => {
        const sample = ((Number.isInteger(derive))? [0, valueToTexture[derive]]
            :   [derive[0], valueToTexture[derive[1]]]);

        if(!sample.every(Number.isInteger)) {
            return console.error('`mapSamples`: invalid map for sample',
                derives, maps, pass, value, derive, d, sample);
        }

        const [step, texture] = sample;
        let i = set.findIndex(([s, t]) => (s === step) && (t === texture));

        ((i < 0) && (i = set.push(sample)-1));

        const passReads = (reads[pass] || (reads[pass] = []));
        const valueReads = (passReads[value] || (passReads[value] = []));

        valueReads[d] = i;
    };

    const getAddSamples = (pass) => (set, value) => {
        const valueDerives = derives[value];

        (valueDerives && each(getAddSample(set, pass, value), valueDerives));

        return set;
    }

    out.samples = map((pass, p) => reduce((set, texture) =>
                reduce(getAddSamples(p), textures[texture], set),
            pass, []),
        passes, []);

    return out;
}

export default mapGroups;
