/**
 * GLSL preprocessor macros for states of the GPGPU state.
 *
 * Use caution when defining these, as each set of different macros will result in new
 * shaders and compilations, missing the cache here and in the rendering system - so,
 * as few unique macros as possible should be created for a given set of inputs, for
 * efficiency.
 */

import { reduce } from 'array-utils';

export const channelsMap = 'rgba';
export const defaultMacros = 'GPGPU';
export const cache = {};

export const getGLSL3List = (type, a, name = 'name', qualifier = '') =>
    (qualifier && qualifier+' ')+`${type} ${name}[${a.length}] = `+
            `${type}[${a.length}](${reduce((out, v, i) =>
                    out+`${type}(${((Array.isArray(v))? v.join(', ') : v)})`+
                        ((i < a.length-1)? ', ' : ''),
                a, '')});`;

export const getGLSL1ArrayList = (type, a, name = 'name', qualifier = '') =>
    `${(qualifier && qualifier+' ')}${type} ${name}[${a.length}];`+
    reduce((s, v, i) =>
            s+' '+`${name}[${i}] = ${type}(${((Array.isArray(v))? v.join(', ') : v)});`,
        a, '');

export const getGLSL1ConstList = (type, a, name = 'name') =>
    `const int ${name}_length = ${a.length};`+
    reduce((s, v, i) => s+
            ` const ${type} ${name}_${i} = `+
                `${type}(${((Array.isArray(v))? v.join(', ') : v)});`,
        a, '')+'\n'+
    // Workaround for lack of `const` arrays in GLSL < 3.0.
    `#define ${name}_index(i) `+reduce((s, v, i) =>
        ((i)? `((i == ${i})? ${name}_${i} : ${s})` : `${name}_${i}`), a, '')+'\n';

export const getGLSL1List = (type, a, name = 'name', qualifier = '') =>
    ((qualifier === 'const')? getGLSL1ConstList : getGLSL1ArrayList)
        (type, a, name, qualifier);

/**
 * Creates a GLSL definition of an array, and initialises it with the given values,
 * type, and variable name.
 * The initialisation is valid GLSL 1.0 or greater syntax; but is written with escaped
 * new-lines so it may be used in a single-line - e.g: for preprocessor macros.
 * For `const` qualifiers on any `version` less than `3`, falls back to using non-array
 * variables with the index appended to `name`, since `const` arrays aren't supported
 * before GLSL 3.0.
 *
 * @example
 *     getGLSLList([0, 1], 'int') ===
 *           'int name[2]; '+
 *           'name[0] = int(0); '+
 *           'name[1] = int(1);';
 *
 *     getGLSLList([[0, 1], [0, 0]], 'ivec2', 'vectors', '', 3) ===
 *           'ivec2 vectors[2] = ivec2[2](ivec2(0, 1), ivec2(0, 0));';
 *
 *     getGLSLList([0, 1], 'int', undefined, 'const') ===
 *           'const int name_0 = int(0); '+
 *           'const int name_1 = int(1);';
 *
 * @export
 * @param {string} type The GLSL data-type of the array; should match the cardinality
 *     of the array members, and result in valid GLSL.
 * @param {(array.<number>|array.<array.<number>>)} a The array to transform into GLSL;
 *     may be 1-/2-dimensional.
 * @param {string} [name] The name of the variable to define the GLSL array.
 * @param {number} [qualifier] Any qualifier (e.g: `const`), or none. Changes the
 *     output of any `version` to 
 * @param {number} [version] The GLSL version to target.
 *
 * @returns {string} The GLSL array initialisation syntax.
 */
export const getGLSLList = (type, a, name = 'name', qualifier = '', version = 1) =>
    ((version >= 3)? getGLSL3List : getGLSL1List)(type, a, name, qualifier);

/**
 * Whether macros should be created; or the result of creating them elsewhere.
 *
 * @param {object} props The properties used for macro generation.
 * @param {string} [key] The ID for which macros should be generated.
 * @param {(string|function|object|falsey)} [macros=props.macros] Whether and how
 *     GLSL preprocessor macro definitions and prefixes should be generated:
 *     - If this is defined and falsey, no macros are generated.
 *     - If this is a function, it's called with the given `props`, `key`, `macros`.
 *     - If this is an object map, any value at the given `key` is handled recursively
 *         as above with the given `props`, `key`, `macros`.
 *     - Otherwise, returns `false` to indicate macros haven't been generated and
 *         should be generated elsewhere.
 *
 * @returns {(string|*|false)} Either the result of the generated macros, or `false` if
 *     macros should be generated elsewhere.
 */
export const checkGPGPUMacros = (props, key, macros = props.macros) =>
    ((!macros)? ((macros === undefined)? false : '')
    : ((typeof macros === 'function')? macros(props, key, macros)
    : ((typeof macros === 'object' && (key in macros))?
            checkGPGPUMacros(props, key, macros[key])
        :   false)));

/**
 * Defines the active GLSL preprocessor macro samples and reads for the active pass.
 * The macros define the mapping between the values and the minimum texture samples for
 * the data they derive from. They are set up as function-like macros that may be
 * called from the shader to initialise the mappings arrays with a chosen variable name.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkGPGPUMacros
 * @see getGLSLList
 * @see [getGPGPUSamplesMap]{@link ./maps.js#getGPGPUSamplesMap}
 * @see [getGPGPUState]{@link ./state.js#getGPGPUState}
 *
 * @example
 *     macroGPGPUSamples({
 *             pass: 0,
 *             // Per-pass, minimum values' texture samples.
 *             samples: [
 *                 // Pass samples - entries are pairs of step and texture indexes.
 *                 [[0, 1], [0, 0]],
 *                 [[0, 2], [1, 0]]
 *             ],
 *             // Per-pass, value indexes to texture samples.
 *             reads: [
 *                 [[0, 1], , , ],
 *                 [, , [0, 1], [0]]
 *             ]
 *         }) ===
 *        '#define GPGPUUseSamples '+
 *            'const ivec2 GPGPUSamples_0 = ivec2(0, 1); '+
 *            'const ivec2 GPGPUSamples_1 = ivec2(0, 0);\n'+
 *        '#define GPGPUSamples_length 2\n'+
 *        '\n'+
 *        '#define GPGPUUseReads0 '+
 *            'const int GPGPUReads_0_0 = int(0); '+
 *            'const int GPGPUReads_0_1 = int(1);\n'
 *        '#define GPGPUReads_0_length 2\n'+
 *         '\n';
 *
 * @param {object.<number, array.<array.<array>>, array.<array.<array>>>} props The
 *     properties used to generate the preprocessor macros:
 * @param {(string|function|object|falsey)} [props.macros=defaultMacros] How macros
 *     should be generated - see `checkGPGPUMacros`.
 * @param {number} props.pass The index of the currently active pass.
 * @param {array.<array.<array.<number>>>} props.samples The minimal set of texture
 *     samples to use - see `getGPGPUSamplesMap`;
 * @param {array.<array.<array.<number>>>} props.reads The mappings from values to
 *     the corresponding `props.samples` - see `getGPGPUSamplesMap`.
 * @param {string} [qualifier='const'] Whether the generated variables should have a
 *     GLSL qualifier such as `const` - see `getGLSLList`.
 * @param {number} [version=1] Any GLSL language version that needs to be specified -
 *     see `getGLSLList`.
 * @param {boolean} [loop=true] Whether to generate GLSL preprocessor macros for doing
 *     some of the loop lookup logic.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for samples and
 *     reads, for each value.
 */
export function macroGPGPUSamples(props, qualifier = 'const', version = 1, loop = true) {
    const key = 'samples';
    const created = checkGPGPUMacros(props);

    if(created !== false) { return created; }

    const {
            macros: m = defaultMacros,
            pass,
            groups: { samples, reads, textures: { length: numTextures } }
        } = props;

    const passSamples = (samples && samples[pass]);
    const passReads = (reads && reads[pass]);

    const c = key+':'+JSON.stringify({
        m, pass, passSamples, passReads, numTextures, qualifier, version
    });

    return (cache[c] || (cache[c] =
        ((!passSamples)? ''
        :   `#define ${m}UseSamples `+
                getGLSLList('ivec2', passSamples, `${m}Samples`, qualifier, version)+
            '\n'+
            // Handle the whole `for` loop and indexing logic, as it's a pain to repeat.
            ((!loop)? ''
            :   `#define ${m}TapSamples(sampled, states, uv) `+
                `vec4 sampled[${m}Samples_length]; `+
                `for(int s = 0; s < ${m}Samples_length; ++s) { `+reduce((o, v, i) => {
                        const si = `${m}Samples_${i}`;
                        const body = `sampled[s] = `+
                            `texture2D(states[(${si}[0]*${numTextures})+${si}[1]], `+
                                'uv);';

                        return ((passSamples.length === 1)?
                                body
                            : ((i === 0)?
                                `if(s == ${i}) { ${body} }`
                            : ((i < passSamples.length-1)?
                                `${o} else if(s == ${i}) { ${body} }`
                            :   `${o} else { ${body} }`)));
                    },
                    passSamples, '')+
                ' }\n\n'))+
        ((!passReads)? ''
        :   reduce((out, valueReads, v) =>
                    out+`#define ${m}UseReads_${v} `+
                        getGLSLList('int', valueReads, `${m}Reads_${v}`,
                            qualifier, version)+
                        '\n',
                passReads, ''))));
}

/**
 * Defines the GLSL preprocessor macro values and textures per step.
 * The macros define the mapping between values and their data textures and channels.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkGPGPUMacros
 * @see [getGPGPUGroupsMap]{@link ./maps.js#getGPGPUGroupsMap}
 * @see [getGPGPUState]{@link ./state.js#getGPGPUState}
 *
 * @example
 *     const props = {
 *         pass: 0,
 *         passes: getGPGPUGroupsMap([4, 2, 1], 1, 4),
 *         steps: [[], []]
 *     };
 *
 *     macroGPGPUStepPass(props) ==
 *         '#define GPGPUTexture_0 0\n'+ // Which texture value 0 is drawn into.
 *         '#define GPGPUChannels_0 rgba\n'+ // Which channels value 0 is drawn into.
 *         '#define GPGPUTexture_1 1\n'+ // Which texture value 1 is drawn into.
 *         '#define GPGPUChannels_1 rg\n'+ // Which channels value 1 is drawn into.
 *         '#define GPGPUTexture_2 1\n'+ // Which texture value 2 is drawn into.
 *         '#define GPGPUChannels_2 b\n'+ // Which channels value 2 is drawn into.
 *
 * @export
 * @param {object.<array.<number>, array.<array.<number>>>} props Properties used to
 *     generate the macros - see `getGPGPUState`:
 * @param {(string|function|object|falsey)} [props.macros=defaultMacros] How macros
 *     should be generated - see `checkGPGPUMacros`.
 * @param {array.<number>} props.values How values of each data item may be grouped
 *     into textures - see `getGPGPUState`.
 * @param {array.<array.<number>>} props.groups.textures The groupings of values into
 *     textures - see `getGPGPUGroupsMap`.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for textures
 *     and channels; for all values.
 */
export function macroGPGPUValues(props) {
    const key = 'values';
    const created = checkGPGPUMacros(props, key);

    if(created !== false) { return created; }

    const {
            macros: m = defaultMacros, values, 
            steps: { length: numSteps },
            groups: { textures, passes: { length: numPasses } }
        } = props;

    const c = key+':'+
        JSON.stringify({ m, textures, values, numSteps, numPasses });

    return (cache[c] || (cache[c] =
        reduce((out, texture, b) => {
                let sum = 0;

                return reduce((out, v) => out+'\n'+
                        `#define ${m}Texture_${v} ${b}\n`+
                        `#define ${m}Channels_${v} ${
                            channelsMap.slice(sum, sum += values[v])}\n`,
                    texture, out);
            },
            textures, '')+'\n'+
        `#define ${m}Textures ${textures.length}\n`+
        `#define ${m}Passes ${numPasses}\n`+
        `#define ${m}Steps ${numSteps}\n`+
        `#define ${m}StepsPast ${numSteps-1}\n`));
}

/**
 * Defines the GLSL preprocessor macro values, passes, and textures for the active pass.
 * The macros define the mapping between the active values and their bound textures and
 * as well as the other macros needed for a draw pass.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkGPGPUMacros
 * @see macroGPGPUValues
 * @see macroGPGPUSamples
 * @see [getGPGPUGroupsMap]{@link ./maps.js#getGPGPUGroupsMap}
 * @see [getGPGPUState]{@link ./state.js#getGPGPUState}
 *
 * @example
 *     const props = {
 *         pass: 0,
 *         passes: getGPGPUGroupsMap([4, 2, 1], 1, 4),
 *         steps: [[], []]
 *     };
 *
 *     macroGPGPUStepPass(props) ==
 *         '#define GPGPUTexture_0 0\n'+ // Which texture value 0 is drawn into.
 *         '#define GPGPUChannels_0 rgba\n'+ // Which channels value 0 is drawn into.
 *         '#define GPGPUTexture_1 1\n'+ // Which texture value 1 is drawn into.
 *         '#define GPGPUChannels_1 rg\n'+ // Which channels value 1 is drawn into.
 *         '#define GPGPUTexture_2 1\n'+ // Which texture value 2 is drawn into.
 *         '#define GPGPUChannels_2 b\n'+ // Which channels value 2 is drawn into.
 *         '\n'+
 *         '#define GPGPUTextures 2\n'+ // Total number of textures (for states array).
 *         '#define GPGPUPasses 2\n'+ // Total number of passes (for states array).
 *         '#define GPGPUSteps 2\n'+ // Total number of steps (for states array).
 *         '#define GPGPUStepsPast 1\n'+ // The past number of steps (for states array).
 *         '\n'+
 *         '#define GPGPUPass 0\n'+ // The current pass (need shaders per pass).
 *         '\n'+
 *         '#define GPGPUBound_0 0\n'+ // Full output for value 0.
 *         '#define GPGPUOutput_0 gl_FragData[0].rgba\n'+ // Full output for value 0.
 *         '\n'+
 *         macroGPGPUSamples(props)+'\n';
 *
 *     ++props.pass;
 *     props.macros = 'draw';
 *
 *     macroGPGPUStepPass(props) ==
 *         '#define drawTexture_0 0\n'+ // Which texture value 0 is drawn into.
 *         '#define drawChannels_0 rgba\n'+ // Which channels value 0 is drawn into.
 *         '#define drawTexture_1 1\n'+ // Which texture value 1 is drawn into.
 *         '#define drawChannels_1 rg\n'+ // Which channels value 1 is drawn into.
 *         '#define drawTexture_2 1\n'+ // Which texture value 2 is drawn into.
 *         '#define drawChannels_2 b\n'+ // Which channels value 2 is drawn into.
 *         '\n'+
 *         '#define drawTextures 2\n'+ // Total number of textures (for states array).
 *         '#define drawPasses 2\n'+ // Total number of passes (for states array).
 *         '#define drawSteps 2\n'+ // Total number of steps (for states array).
 *         '#define drawStepsPast 1\n'+ // Total number of steps (for states array).
 *         '\n'+
 *         '#define drawPass 1\n'+ // The current pass (need shaders per pass).
 *         '\n'+
 *         '#define drawBound_1 0\n'+ // Full output for value 1.
 *         '#define drawOutput_1 gl_FragData[0].rg\n'+ // Full output for value 1.
 *         '\n'+
 *         '#define drawBound_2 0\n'+ // Full output for value 2.
 *         '#define drawOutput_2 gl_FragData[0].b\n'+ // Full output for value 2.
 *         '\n'+
 *         macroGPGPUSamples(props)+'\n';
 *
 *     props.pass = 0;
 *     props.steps.push([]);
 *     props.passes = getGPGPUGroupsMap([4, 2, 1], 4, 4);
 *
 *     macroGPGPUStepPass(props) ==
 *         '#define drawTexture_0 0\n'+ // Which texture value 0 is drawn into.
 *         '#define drawChannels_0 rgba\n'+ // Which channels value 0 is drawn into.
 *         '#define drawTexture_1 1\n'+ // Which texture value 1 is drawn into.
 *         '#define drawChannels_1 rg\n'+ // Which channels value 1 is drawn into.
 *         '#define drawTexture_2 1\n'+ // Which texture value 2 is drawn into.
 *         '#define drawChannels_2 b\n'+ // Which channels value 2 is drawn into.
 *         '\n'+
 *         '#define drawTextures 2\n'+ // Total number of textures (for states array).
 *         '#define drawPasses 1\n'+ // Total number of passes (for states array).
 *         '#define drawSteps 3\n'+ // Total number of steps (for states array).
 *         '#define drawStepsPast 2\n'+ // Total number of steps (for states array).
 *         '\n'+
 *         '#define drawPass 0\n'+ // The current pass (need shaders per pass).
 *         '\n'+
 *         '#define drawBound_0 0\n'+ // Full output for value 0.
 *         '#define drawOutput_0 gl_FragData[0].rgba\n'+ // Full output for value 0.
 *         '\n'+
 *         '#define drawBound_1 1\n'+ // Full output for value 1.
 *         '#define drawOutput_1 gl_FragData[1].rg\n'+ // Full output for value 1.
 *         '\n'+
 *         '#define drawBound_2 1\n'+ // Full output for value 2.
 *         '#define drawOutput_2 gl_FragData[1].b\n'+ // Full output for value 2.
 *         '\n'+
 *         macroGPGPUSamples(props)+'\n';
 *
 * @export
 * @param {object} props Properties used to generate the macros - see `getGPGPUState`:
 * @param {(string|function|object|falsey)} [props.macros=defaultMacros] How macros
 *     should be generated - see `checkGPGPUMacros`.
 * @param {number} props.pass The index of the currently active pass.
 * @param {number} props.steps.length The number of states to be drawn across frames -
 *     see `getGPGPUState`.
 * @param {array.<number>} props.values How values of each data item may be grouped
 *     into textures across passes - see `getGPGPUState`.
 *
 * @param {object.<array.<array.<number>>, array.<array.<number>>>} props.groups
 *     The groupings of values to be drawn across passes - see `getGPGPUGroupsMap`.
 * @param {array.<array.<number>>} props.groups.textures The groupings of values into
 *     textures - see `getGPGPUGroupsMap`.
 * @param {array.<array.<number>>} props.groups.passes The groupings of textures into
 *     passes - see `getGPGPUGroupsMap`.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for values,
 *     textures, channels, and outputs of the active pass; along with other features.
 */
export function macroGPGPUStepPass(props) {
    const key = 'pass';
    const created = checkGPGPUMacros(props, key);

    if(created !== false) { return created; }

    const {
            macros: m = defaultMacros,
            pass: p,
            values,
            groups: { textures, passes }
        } = props;

    const pass = passes[p];
    const macroSamples = macroGPGPUSamples(props);
    const macroValues = macroGPGPUValues(props);
    const c = key+':'+JSON.stringify({ m, textures, values, p, pass });

    return macroSamples+macroValues+(cache[c] || (cache[c] =
        `#define ${m}Pass ${p}\n`+
        reduce((out, texture, bound) => {
                let sum = 0;

                return reduce((out, v) => out+'\n'+
                        `#define ${m}Bound_${v} ${texture}\n`+
                        `#define ${m}Output_${v} gl_FragData[${bound}].${
                            channelsMap.slice(sum, sum += values[v])}\n`,
                    textures[texture], out);
            },
            pass, '')+
        '\n'));
}

export function macroGPGPUDraw(props) {
    const key = 'draw';
    const created = checkGPGPUMacros(props, key);

    if(created !== false) { return created; }

    return macroGPGPUValues(props);
}
