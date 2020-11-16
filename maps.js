/**
 * GPGPU ping-pong, input and output mappings for the GPGPU step/draw shaders.
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
 */

import { map, reduce, each } from '@epok.tech/array-utils';

/**
 * Groups the `values` of GPGPU data items across draw passes and data textures.
 * The `values` are grouped in the given order, which may affect the number of
 * passes/textures used:
 *
 * @example
 *     mapGroups([2, 4, 1], 1, 4); // =>
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
 *     mapGroups([4, 2, 1], 1, 4); // =>
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
 *     mapGroups([4, 2, 1], 4, 4); // =>
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
 *     mapGroups([2, 4, 1], 4, 4); // =>
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
 *     mapGroups([2, 4, 1, 2], 2, 4); // =>
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
 * @export
 * @param {array.<number>} values An array where each number is how many value
 *     channels are grouped into one data texture in one draw pass; each
 *     separate number may be drawn across one or more data textures/passes.
 *     Each value denotes the number of dependent channels to be drawn together;
 *     separate values denote channels that aren't co-dependent, and may be
 *     drawn in or separate passes, depending on device support.
 *     The given order is (currently) maintained and may affect the number of
 *     passes/textures used. Where the next state depends on previous states,
 *     these should ideally be an entry of `channels` or less, for fewest
 *     texture reads to retrieve previous states.
 * @param {number} [texturesMax=1] Maximum textures to be used per draw pass.
 * @param {number} [channelsMax=4] Maximum channels any of the `values`.
 *
 * @returns {object.<(number|array.<(number|array.<number>)>)>} `out` How
 *     `values` are grouped per-texture-per-pass-per-step, meta information, and
 *     given parameters.
 *
 * @returns {array.<array.<number>>} `out.passes` Textures grouped into passes;
 *     arrays corresponding to framebuffers in separate draw passes; whose
 *     values are indexes into `out.textures`.
 * @returns {array.<array.<number>>} `out.textures` Values grouped into
 *     textures; arrays corresponding to framebuffer attachments, into which
 *     `values` are drawn; whose values are indexes into `out.values`.
 *
 * @returns {array.<number>} `out.values` The `values`, as given.
 * @returns {number} `out.texturesMax` The max textures per pass, as given.
 * @returns {number} `out.channelsMax` The max channels per texture, as given.
 *
 * @returns {array.<number>} `out.valueToTexture` Inverse map from each index of
 *     `out.values` to the index of the the data texture containing it.
 * @returns {array.<number>} `out.valueToPass` Inverse map from each index of
 *     `out.values` to the index of the the pass containing it.
 * @returns {array.<number>} `out.textureToPass` Inverse map from each index of
 *     `out.textures` to the index of the the pass containing it.
 */
export function mapGroups(values, texturesMax = 1, channelsMax = 4) {
    // Counts the number of channels written in a single draw pass.
    let channels = 0;

    return reduce((out, value, index) => {
            if(value > channelsMax) {
                console.warn('`gl-gpgpu`: none of the given `values` '+
                    `(${value}) should exceed the total number of channels `+
                    `available in a texture (${channelsMax}).`,
                    values);

                return out;
            }

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

            texture.push(index);
            valueToTexture.push(t);
            valueToPass.push(p);

            return out;
        },
        values,
        {
            passes: [[]],
            textures: [[]],
            values,
            texturesMax,
            channelsMax,
            valueToTexture: [],
            valueToPass: [],
            textureToPass: []
        });
}

/**
 * Maps the minimal set of texture reads to derive the next state of values from
 * a past state of values they depend upon.
 *
 * @example
 *     const maps = mapGroups([2, 4, 1, 2], 2, 4);
 *
 *     // Entries per-value of derived step/value indexes, entries include:
 *     // empty, single, multiple, and defined step samples.
 *     const derives = [[1, 0], , [3, [-1, 0]], [2]];
 *
 *     mapSamples(derives, maps); // =>
 *     {
 *         ...maps, derives,
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
 * @param {array.<(null|array.<(number|array.<number>)>)>} derives How values
 *     are derived. For each value index, a list of indexes of any past values
 *     it derives its from - a value not derived from past values may have an
 *     empty/null entry; a value derives from past values where its entry has:
 *     - Numbers, deriving from the most recent state at the given value index.
 *     - Lists of numbers, deriving from the given past state index (first
 *         number: 0-and-up states ago, negatives go old-to-new) at the given
 *         value index (second number).
 *
 * @param {object.<(number|array.<(number|array.<number>)>)>} maps The maps
 *     for the given `derives`. See `mapGroups`.
 * @param {object} [out=maps] The object to store the result in; `maps` if
 *     not given.
 *
 * @returns {object.<array.<array.<(null|array.<number>)>>>} `out` The given
 *     `out` object, with the resulting maps added.
 * @returns {array.<array.<array.<number>>>} `out.samples` Map of the minimum
 *     set of indexes into `maps.textures` that need to be sampled per-pass,
 *     to get all `derives` needed for each value of `maps.values` of each
 *     pass of `maps.passes`.
 * @returns {array.<array.<(null|array.<number>)>>} `out.reads` Sparse map from
 *     each value of `derives` to its step and texture indexes in `out.samples`.
 * @returns {array.<(null|array.<(number|array.<number>)>)>} `out.derives` How
 *     values are derived, as given.
 */
export function mapSamples(derives, maps, out = maps) {
    const { passes, textures, valueToTexture } = maps;
    const reads = out.reads = [];

    const getAddSample = (set, pass, value) => (derive, d) => {
        const sample = ((Array.isArray(derive))?
                [derive[0], valueToTexture[derive[1]]]
            :   [0, valueToTexture[derive]]);

        if(!sample.every(Number.isInteger)) {
            return console.warn('`mapSamples`: invalid map for sample',
                derives, maps, pass, value, derive, sample);
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

    out.derives = derives;

    return out;
}

export default mapGroups;
