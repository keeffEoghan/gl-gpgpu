/**
 * GPGPU ping-pong, input and output mappings for the GPGPU step/draw shaders.
 *
 * These maps show shaders how to make use of a system's supported features, how
 * to pack/unpack their data with framebuffers/textures, perform only the needed
 * texture samples to retrieve any past values they must derive from, etc.
 * Shaders may declare values they output, values they derive from, groupings of
 * dependent/independent values - without handling how these concerns map to the
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
 *     mapGroups([2, 4, 1], 1, 4) => {
 *             values: [2, 4, 1],
 *             textures: [[0], [1], [2]], // length === 3
 *             passes: [[0], [1], [2]] // length === 3
 *         };
 *
 *     mapGroups([4, 2, 1], 1, 4) => {
 *             values: [4, 2, 1],
 *             textures: [[0], [1, 2]], // length === 2
 *             passes: [[0], [1]] // length === 2
 *         };
 *
 *     mapGroups([4, 2, 1], 4, 4) => {
 *             values: [4, 2, 1],
 *             textures: [[0], [1, 2]], // length === 2
 *             passes: [[0, 1]] // length === 1
 *         };
 *
 *     mapGroups([2, 4, 1], 4, 4) => {
 *             values: [2, 4, 1],
 *             textures: [[0], [1], [2]], // length === 3
 *             passes: [[0, 1, 2]] // length === 1
 *         };
 *
 *     mapGroups([2, 4, 1], 2, 4) => {
 *             values: [2, 4, 1],
 *             textures: [[0], [1], [2]], // length === 3
 *             passes: [[0, 1], [2]] // length === 2
 *         };
 *
 *     mapGroups([2, 4, 1, 2], 2, 4) => {
 *             values: [2, 4, 1, 2],
 *             textures: [[0], [1], [2, 3]], // length === 3
 *             passes: [[0, 1], [2]] // length === 2
 *         };
 *
 *     mapGroups([2, 4, 1, 4], 2, 4) => {
 *             values: [2, 4, 1, 4],
 *             textures: [[0], [1], [2], [3]], // length === 4
 *             passes: [[0, 1], [2, 3]] // length === 2
 *         };
 *
 * @export
 * @param {Array.<number>} values An array, each number is how many values are to be
 *     grouped into one data texture in one draw pass, and separate numbers may be
 *     drawn across one or more data textures across one or more draw passes.
 *     Each value should be the number of co-dependent channels that must be drawn
 *     together in one pass. Separate values denote channels that aren't co-dependent
 *     and may be drawn in one pass or across separate passes, depending on support.
 *     The given order is (currently) maintained and may affect the number of passes
 *     and textures used. Also, in cases where the next state depends on the previous
 *     state, these should try to be in groups of `channels` or less, in order to do as
 *     few texture reads as possible in the step shaders to retrieve previous states.
 *
 * @param {number} [texturesMax=1] Maximum number of textures to be used per draw pass.
 * @param {number} [channelsMax=4] Maximum number of channels any of the `values`.
 *
 * @returns {Object.<Array.<Array.<number>>, Array.<Array.<number>>, ...>} `out` The
 *     `values` grouped into passes and textures; plus given parameters and meta info.
 *
 * @returns {array.<array.<number>>} `out.passes` The groupings of textures into passes;
 *     arrays corresponding to framebuffers in separate draw passes; whose values are
 *     indexes into `out.textures`.
 * @returns {array.<array.<number>>} `out.textures` The groupings of textures; arrays
 *     corresponding to framebuffer attachments into which `values` are drawn; whose
 *     values are indexes into `values`.
 *
 * @returns {array.<number>} `out.values` The `values`, as given.
 * @returns {number} `out.texturesMax` The `texturesMax`, as given.
 * @returns {number} `out.channelsMax` The `channelsMax`, as given.
 *
 * @returns {array.<number>} `out.valueToTexture` A reverse map from each index of
 *     `values` to the index of the data texture which contains it; for convenience.
 * @returns {array.<number>} `out.valueToPass` A reverse map from each index of
 *     `values` to the index of the pass which contains it; for convenience.
 * @returns {array.<number>} `out.textureToPass` A reverse map from each index of
 *     `out.textures` to the index of the pass which contains it; for convenience.
 */
export function mapGroups(values, texturesMax = 1, channelsMax = 4) {
    // The maximum number of channels writeable in a single draw pass.
    let sum = 0;

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
            let b = textures.length-1;
            let texture = textures[b];

            if((sum += value) > channelsMax) {
                sum = value;
                b = textures.push(texture = [])-1;

                ((pass.length >= texturesMax) && (p = passes.push(pass = [])-1));
                pass.push(b);
                textureToPass.push(p);
            }
            else if(pass.length === 0) {
                pass.push(b);
                textureToPass.push(p);
            }

            texture.push(index);
            valueToTexture.push(b);
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
 * Gives the mappings for a minimal set of texture samples that need to be taken
 * to derive the next state of values.
 *
 * @example
 *     const groups = mapGroups([2, 4, 1, 2], 2, 4);// =
 *     {
 *         values: [2, 4, 1, 2],
 *         textures: [[0], [1], [2, 3]], // length === 3
 *         passes: [[0, 1], [2]] // length === 2
 *     };
 *
 *     // Entries per-value of derived step/value indexes, with entries including:
 *     // empty, single, multiple, and defined step samples.
 *     const derives = [[1, 0], , [3, [1, 0]], [2]];
 *
 *     mapSamples(derives, groups);// =
 *     {
 *         // Per-pass, minimum texture samples for values.
 *         samples: [
 *             // Per-value - step/texture index pairs into `groups.textures`.
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
 * @todo Consider packing sample index pairs into a single number (float with texture
 *     and step either side of the decimal, or int of `texture+(step*textures.length)`).
 *
 * @export
 * @param {array.<array.<(null|number|array.<number>)>>} derives For every value,
 *     an array of indexes of any other values it derives its next state from - values
 *     without derivations may have empty entries; values with an array entry derive
 *     from others:
 *     - Where a value's entry array has a number, it derives from the most
 *     recent state step at the given value index.
 *     - Where a value's entry array has an array of numbers, it derives from the given
 *     past state index (first number) at the given value index (second number).
 *
 * @param {object.<array.<array>, array.<array>, array.<number>, array.<number>>}
 *     groups The groups for the given `derives`; with `passes`, `textures`,
 *     `values`, and `valueToTexture` properties - see `mapGroups`.
 * @param {object} [out=groups] The object to store the result in.
 *
 * @returns {object.<array.<array.<array.<number>>>, array.<array.<array.<number>>>>}
 *     `out` The given `out` object, with the resulting maps added.
 * @returns {array.<array.<array.<number>>>} `out.samples` Map of the minimum set of
 *     indexes of `groups.textures` that need to be sampled per-pass, in order to get
 *     all the `derives` needed for each of the `groups.values` of each pass of
 *     `groups.passes`.
 * @returns {array.<array.<array.<number>>>} `out.reads` Sparse map from each value
 *     index of `derives` to the index of the step and texture its derives are
 *     stored at in `out.samples`.
 */
export function mapSamples(derives, groups, out = groups) {
    const { passes, textures, values, valueToTexture } = groups;
    const reads = out.reads = [];

    const getAddSample = (set, pass, value) => (derive, d) => {
        const sample = ((Array.isArray(derive))?
                [derive[0], valueToTexture[derive[1]]]
            :   [0, valueToTexture[derive]]);

        if(!sample.every(Number.isInteger)) {
            return console.warn('`mapSamples`: invalid map for sample',
                derives, groups, pass, value, derive, sample);
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

    out.samples = map((pass, p) =>
            reduce((set, texture) =>
                    reduce(getAddSamples(p), textures[texture], set),
                pass, []),
        passes, []);

    return out;
}

export default mapGroups;
