/**
 * GLSL preprocessor macros for states of the GPGPU state.
 *
 * Careful defining these, as each set of different macros will result in new
 * shaders and compilations, missing the cache here and in the rendering system.
 * So, as few unique macros as possible should be created for a given set of
 * inputs, for efficiency.
 *
 * @todo Consider doing something better with indentation.
 */

import { reduce } from '@epok.tech/array-utils';

export const rgba = 'rgba';
export const macrosDef = 'GPGPU';
export const cache = {};

/**
 * Generates an array declaration, as a GLSL 3 syntax string.
 * Lookup and meta macros are added for consistency with other versions.
 *
 * @export
 * @example
 *     getGLSL3List('int', 'list', [1, 2, 3], 'const'); // =>
 *     'const int list[3] = int[3](int(1), int(2), int(3));\\\n'+
 *     'const int list_l = 3;\n'+
 *     '#define list_i(i) list[i]\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array.<(number|array.<number>)>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 *
 * @returns {string} The GLSL 3 array declaration string.
 */
export const getGLSL3List = (type, name, a, qualify = '') =>
    `${(qualify && qualify+' ')+type} ${name}[${a.length}] = ${
        type}[${a.length}](${reduce((s, v, i) =>
                `${s+type}(${((Array.isArray(v))? v.join(', ') : v)})${
                    ((i < a.length-1)? ', ' : '')}`,
            a, '')});\\\n`+
    `const int ${name}_l = ${a.length};\n`+
    `#define ${name}_i(i) ${name}[i]\n`;

/**
 * Generates an array declaration, as a GLSL 1 syntax string.
 * Lookup and meta macros are added for consistency with other versions.
 *
 * @export
 * @example
 *     getGLSL1ListArray('vec3', 'list', [[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
 *     // =>
 *     'vec3 list[3];\\\n'+
 *     'list[0] = vec3(1, 0, 0);\\\n'+
 *     'list[1] = vec3(0, 2, 0);\\\n'+
 *     'list[2] = vec3(0, 0, 3);\\\n'+
 *     'const int list_l = 3;\n'+
 *     '#define list_i(i) list[i]\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array.<(number|array.<number>)>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 *
 * @returns {string} The GLSL 1 array declaration string.
 */
export const getGLSL1ListArray = (type, name, a, qualify = '') =>
    `${(qualify && qualify+' ')+type} ${name}[${a.length}];\\\n${
    reduce((s, v, i) =>
            `${s+name}[${i}] = ${
                type}(${((Array.isArray(v))? v.join(', ') : v)});\\\n`,
        a, '')
    }const int ${name}_l = ${a.length};\n`+
    `#define ${name}_i(i) ${name}[i]\n`;

/**
 * Generates an array-like declaration, as a GLSL 1 syntax string.
 * Workaround for lack of `const` arrays in GLSL < 3.
 *
 * @export
 * @example
 *     getGLSL1ListLike('float', 'list', [1, 2, 3], 'const'); // =>
 *     'const int list_0 = float(1);\\\n'+
 *     'const int list_1 = float(2);\\\n'+
 *     'const int list_2 = float(3);\\\n'+
 *     'const int list_l = 3;\n'+
 *     '#define list_i(i) \\\n'+
 *         '((i == 2)? list_2\\\n'+
 *         ': ((i == 1)? list_1\\\n'+
 *         ': list_0))\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array.<(number|array.<number>)>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 *
 * @returns {string} The GLSL 1 array-like declaration string.
 */
export const getGLSL1ListLike = (type, name, a, qualify = '') =>
    reduce((s, v, i) =>
            `${s+(qualify && qualify+' ')+type} ${name}_${i} = ${
                type}(${((Array.isArray(v))? v.join(', ') : v)});\\\n`,
        a, '')+
    `const int ${name}_l = ${a.length};\n`+
    // `#define ${name}_i(i) ${name}_##i\\\n`;
    `#define ${name}_i(i) \\\n${
        reduce((s, v, i) =>
            ((i)? `((i == ${i})? ${name}_${i} \\\n: ${s})` : `${name}_${i}`),
        a, '')
    }\n`;

/**
 * Creates a GLSL definition of an array, and initialises it with the given
 * values, type, and variable name.
 * The initialisation is valid GLSL 1.0 or greater syntax; but is written with
 * escaped new-lines so it may be used in a single-line - e.g: for preprocessor
 * macros.
 * For a `qualify` of `const` on any `glsl` less than `3`, falls back to using
 * non-array variables with the index appended to `name`, since `const` arrays
 * aren't supported before GLSL 3.0.
 *
 * @example
 *     getGLSLList('int', 'test', [0, 1]); // =>
 *     'int test[2];\\\n'+
 *     'test[0] = int(0);\\\n'+
 *     'test[1] = int(1);\\\n'+
 *     'const int test_l = 2;\n'+
 *     '#define test_i(i) test[i]\n';
 *
 *     getGLSLList('ivec2', 'vectors', [[0, 1], [0, 0]], 'const', 3); // =>
 *     'const ivec2 vectors[2] = ivec2[2](ivec2(0, 1), ivec2(0, 0));\\\n'+
 *     'const int vectors_l = 2;\n'+
 *     '#define vectors_i(i) vectors[i]\n';
 *
 *     getGLSLList('int', 'listLike', [0, 1], 'const', 1); // =>
 *     'const int listLike_0 = int(0);\\\n'+
 *     'const int listLike_1 = int(1);\\\n'+
 *     'const int listLike_l = 2;\n'+
 *     '#define listLike_i(i) \\\n'+
 *         '((i == 1)? listLike_1\\\n'+
 *         ': listLike_0)\n';
 *
 * @export
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array.<(number|array.<number>)>} a The list of GLSL values.
 * @param {number} [qualify=''] A GLSL qualifier, if needed (e.g: `const`).
 * @param {number} [glsl] The GLSL version to target, if specified.
 *
 * @returns {string} The GLSL (1 or 3) array or array-like declaration string.
 */
export const getGLSLList = (type, name, a, qualify = '', glsl = 1) =>
    ((glsl >= 3)? getGLSL3List
    : ((qualify.trim() === 'const')? getGLSL1ListLike
    :   getGLSL1ListArray))(type, name, a, qualify);

/**
 * Whether macros should be created; or the result of creating them elsewhere.
 *
 * @param {object} props The properties used for macro generation.
 * @param {string} [key] The ID for which macros should be generated.
 * @param {(string|function|object|falsey)} [macros=props.macros] Whether and
 *     how GLSL preprocessor macro definitions and prefixes should be generated:
 *     - If this is defined and falsey, no macros are generated.
 *     - If this is a function, it's called with the given `props`, `key`,
 *         and `macros`.
 *     - If this is an object map, any value at the given `key` is handled
 *         recursively as above with the given `props`, `key`, `macros`.
 *     - Otherwise, returns `false` to indicate macros haven't been generated
 *         and should be generated elsewhere.
 *
 * @returns {(string|*|false)} Either the result of the generated macros, or
 *     `false` if macros should be generated elsewhere.
 */
export const checkMacros = (props, key, macros = props.macros) =>
    ((macros === undefined)? false
    : ((!macros)? ''
    : ((typeof macros === 'function')? macros(props, key, macros)
    : ((typeof macros === 'object' && (key in macros))?
        checkMacros(props, key, macros[key])
    :   false))));

/**
 * Defines the texture samples/reads per-pass, as GLSL preprocessor macros.
 * The macros define the mapping between the values and the minimum texture
 * samples for the data they derive from. They're set up as function-like macros
 * that may be called from the shader to initialise the mappings arrays with a
 * given name.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkMacros
 * @see getGLSLList
 * @see [mapSamples]{@link ./maps.js#mapSamples}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     macroSamples({
 *         maps: mapSamples([[1, 0], , [3, [1, 0]]],
 *             mapGroups([4, 2, 1], 1, 4)),
 *         pass: 0
 *     }); // =>
 *     '#define GPGPUUseSamples \\\n'+
 *         'const ivec2 GPGPUSamples_0 = ivec2(0, 1);\\\n'+
 *         'const ivec2 GPGPUSamples_1 = ivec2(0, 0);\\\n'+
 *         'const int GPGPUSamples_l = 2;\n'+
 *     '#define GPGPUSamples_i(i) \\\n'+
 *         '((i == 1)? GPGPUSamples_1 \\\n'+
 *         ': GPGPUSamples_0)\n'+
 *     '\n'+
 *     '#define GPGPUTapSamples(out, states, uv) \\\n'+
 *         'vec4 out[GPGPUSamples_l];\\\n'+
 *         'for(int GPGPU_s = 0; GPGPU_s < GPGPUSamples_l; ++GPGPU_s) {'+
 *         '\\\n'+
 *             'vec2 GPGPU_d = GPGPUSamples_i(GPGPU_s);\\\n'+
 *             'int GPGPU_t = (GPGPU_d[0]*GPGPUSamples_l)+GPGPU_d[1];\\\n'+
 *             '\\\n'+
 *             'out[GPGPU_s] = texture2D(states[GPGPU_t], uv);\\\n'+
 *         '}\n'+
 *     '\n'+
 *     '#define GPGPUUseReads_0 \\\n'+
 *         'const int GPGPUReads_0_0 = int(0);\\\n'+
 *         'const int GPGPUReads_0_1 = int(1);\\\n'+
 *         'const int GPGPUReads_0_l = 2;\n'+
 *     '#define GPGPUReads_0_i(i) \\\n'+
 *         '((i == 1)? GPGPUReads_0_1 \\\n'+
 *         ': GPGPUReads_0_0)\n';
 *
 * @param {object.<number, array.<array.<array>>, array.<array.<array>>>} state
 *     The properties used to generate the preprocessor macros:
 * @param {(string|function|object|falsey)} [state.macros=macrosDef] How
 *     macros should be generated. See `checkMacros`.
 * @param {number} state.pass The index of the currently active pass.
 * @param {array.<array.<array.<number>>>} state.maps.samples The minimal set of
 *     texture samples to use. See `mapSamples`.
 * @param {array.<array.<array.<number>>>} state.maps.reads The mappings from
 *     values to the corresponding `state.samples`. See `mapSamples`.
 * @param {number} state.maps.textures.length How many textures to read from.
 *     See `mapGroups`.
 * @param {string} [qualify='const'] Any GLSL qualifier (e.g: `const`) for the
 *     generated variables. See `getGLSLList`.
 * @param {number} [glsl=1] The GLSL language version. See `getGLSLList`.
 * @param {boolean} [loop=true] Whether to generate GLSL preprocessor macros for
 *     some of the lookup logic.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for
 *     samples and reads, for each value.
 */
export function macroSamples(state, qualify = 'const', glsl = 1, loop = true) {
    const key = 'samples';
    const created = checkMacros(state);

    if(created !== false) { return created; }

    const {
            macros: m = macrosDef, pass,
            maps: { samples, reads, textures: { length: texturesL } }
        } = state;

    const passSamples = (samples && samples[pass]);
    const passReads = (reads && reads[pass]);

    const c = key+':'+JSON.stringify({
        m, pass, passSamples, passReads, texturesL, qualify, glsl
    });

    return (cache[c] || (cache[c] =
        ((!passSamples)? ''
        :   `#define ${m}UseSamples \\\n${
                getGLSLList('ivec2', `${m}Samples`, passSamples, qualify, glsl)
            }\n`+
            // The texture-sampling logic.
            ((!loop)? ''
            :   `#define ${m}TapSamples(out, states, uv) \\\n`+
                `vec4 out[${m}Samples_l];\\\n`+
                `for(int ${m}_s = 0; ${m}_s < ${m}Samples_l; ++${m}_s) {\\\n`+
                    `vec2 ${m}_d = ${m}Samples_i(${m}_s);\\\n`+
                    `int ${m}_t = (${m}_d[0]*${m}Samples_l)+${m}_d[1];\\\n`+
                    '\\\n'+
                    `out[${m}_s] = texture2D(states[${m}_t], uv);\\\n`+
                '}\n'))+
        ((!passReads)? ''
        :   reduce((s, valueReads, v) =>
                `${s}\n#define ${m}UseReads_${v} \\\n${
                    getGLSLList('int', `${m}Reads_${v}`, valueReads, qualify,
                        glsl)}`,
                passReads, ''))));
}

/**
 * Defines the values within textures per-step, as GLSL preprocessor macros.
 * These macros define mappings from values to their textures and channels.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkMacros
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     macroValues({
 *         maps: mapGroups([4, 2, 1], 1, 4), pass: 0, steps: Array(2)
 *     }); // =>
 *     '#define GPGPUTexture_0 0\n'+ // Value 0's texture.
 *     '#define GPGPUChannels_0 rgba\n'+ // Value 0's channels.
 *     '\n'+
 *     '#define GPGPUTexture_1 1\n'+ // Value 1's texture.
 *     '#define GPGPUChannels_1 rg\n'+ // Value 1's channels.
 *     '\n'+
 *     '#define GPGPUTexture_2 1\n'+ // Value 2's texture.
 *     '#define GPGPUChannels_2 b\n'+ // Value 2's channels.
 *     '\n'+
 *     // Metadata for the active pass, step, etc.
 *     '#define GPGPUTextures 2\n'+
 *     '#define GPGPUPasses 2\n'+
 *     '#define GPGPUSteps 2\n';
 *
 * @export
 * @param {object.<array.<number>, array.<array.<number>>>} state Properties
 *     used to generate the macros. See `getState`.
 * @param {(string|function|object|falsey)} [state.macros=macrosDef] How macros
 *     should be generated. See `checkMacros`.
 * @param {object.<(number|array.<(number|array.<number>)>)>} state.maps How
 *     values are grouped per-texture-per-pass-per-step.
 * @param {array.<number>} state.maps.values How values of each data item may be
 *     grouped into textures. See `getState`.
 * @param {array.<array.<number>>} state.maps.textures The groupings of values
 *     into textures. See `mapGroups`.
 * @param {number} state.maps.passes.length The number of passes to be drawn
 *     per step. See `getState`.
 * @param {number} state.steps.length The number of states to be drawn across
 *     frames. See `getState`.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings from
 *     values to textures/channels.
 */
export function macroValues(state) {
    const key = 'values';
    const created = checkMacros(state, key);

    if(created !== false) { return created; }

    const {
            macros: m = macrosDef,
            maps: { values, textures, passes: { length: passesL } },
            steps: { length: stepsL }
        } = state;

    const c = key+':'+JSON.stringify({ m, values, textures, stepsL, passesL });

    return (cache[c] || (cache[c] =
        reduce((s, texture, t, _, n = 0) => reduce((s, v) => s+
                    `#define ${m}Texture_${v} ${t}\n`+
                    `#define ${m}Channels_${v} ${
                        rgba.slice(n, (n += values[v]))}\n\n`,
                texture, s),
            textures, '')+
        `#define ${m}Textures ${textures.length}\n`+
        `#define ${m}Passes ${passesL}\n`+
        `#define ${m}Steps ${stepsL}\n`));
}

/**
 * Defines the outputs being drawn to per-pass, as GLSL preprocessor macros.
 * These macros define mappings from values to their outputs, if bound.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkMacros
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     const state = { maps: mapGroups([4, 2, 1], 1, 4), pass: 0 };
 *
 *     macroOutput(state); // =>
 *     '#define GPGPUPass 0\n'+
 *     '\n'+
 *     '#define GPGPUBound_0 0\n'+
 *     '#define GPGPUAttach_0 0\n'+
 *     '#define GPGPUOutput_0 gl_FragData[GPGPUAttach_0].rgba\n';
 *
 *     ++state.pass;
 *
 *     macroOutput(state); // =>
 *     '#define GPGPUPass 1\n'+
 *     '\n'+
 *     '#define GPGPUBound_1 1\n'+
 *     '#define GPGPUAttach_1 0\n'+
 *     '#define GPGPUOutput_1 gl_FragData[GPGPUAttach_1].rg\n'+
 *     '\n'+
 *     '#define GPGPUBound_2 1\n'+
 *     '#define GPGPUAttach_2 0\n'+
 *     '#define GPGPUOutput_2 gl_FragData[GPGPUAttach_2].b\n';
 *
 * @export
 * @param {object} state Properties for generating the macros. See `getState`:
 * @param {(string|function|object|falsey)} [state.macros=macrosDef] How macros
 *     should be generated. See `checkMacros`.
 * @param {number} state.pass The index of the currently active pass.
 * @param {object.<(number|array.<(number|array.<number>)>)>} state.maps How
 *     values are grouped per-texture-per-pass-per-step.
 * @param {array.<number>} state.maps.values How values of each data item may be
 *     grouped into textures across passes. See `getState`.
 * @param {array.<array.<number>>} state.maps.textures The groupings of values
 *     into textures. See `mapGroups`.
 * @param {array.<array.<number>>} state.maps.passes The groupings of textures
 *     into passes. See `mapGroups`.
 *
 * @returns {string} The GLSL preprocessor macros defining the bound outputs.
 */
export function macroOutput(state) {
    const key = 'output';
    const created = checkMacros(state, key);

    if(created !== false) { return created; }

    const {
            macros: m = macrosDef, pass: p, maps: { values, textures, passes }
        } = state;

    const pass = passes[p];
    const c = key+':'+JSON.stringify({ m, p, values, textures, passes });

    return (cache[c] || (cache[c] =
        `#define ${m}Pass ${p}\n`+
        reduce((s, texture, bound, _, n = 0) => reduce((s, v) => `${s}\n`+
                    `#define ${m}Bound_${v} ${texture}\n`+
                    `#define ${m}Attach_${v} ${bound}\n`+
                    `#define ${m}Output_${v} gl_FragData[${m}Attach_${v}].${
                        rgba.slice(n, (n += values[v]))
                    }\n`,
                textures[texture], s),
            pass, '')));
}

/**
 * Defines all GLSL preprocessor macro values, texture samples, and outputs for
 * the active pass.
 * The macros define the mapping between the active values, their textures and
 * channels, bound outputs, and other macros useful for a draw pass.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see checkMacros
 * @see macroValues
 * @see macroOutput
 * @see macroSamples
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     const state = {
 *         maps: mapSamples([[1, 0], [2, [1, 0]]], mapGroups([4, 2, 3], 1, 4)),
 *         steps: Array(2), pass: 0
 *     };
 *
 *     macroPass(state); // =>
 *     '#define GPGPUTexture_0 0\n'+
 *     '#define GPGPUChannels_0 rgba\n'+
 *     '\n'+
 *     '#define GPGPUTexture_1 1\n'+
 *     '#define GPGPUChannels_1 rg\n'+
 *     '\n'+
 *     '#define GPGPUTexture_2 2\n'+
 *     '#define GPGPUChannels_2 rgb\n'+
 *     '\n'+
 *     '#define GPGPUTextures 3\n'+
 *     '#define GPGPUPasses 3\n'+
 *     '#define GPGPUSteps 2\n'+
 *     '\n'+
 *     '#define GPGPUPass 0\n'+
 *     '\n'+
 *     '#define GPGPUBound_0 0\n'+
 *     '#define GPGPUAttach_0 0\n'+
 *     '#define GPGPUOutput_0 gl_FragData[GPGPUAttach_0].rgba\n'+
 *     '\n'+
 *     '#define GPGPUUseSamples \\\n'+
 *         'const ivec2 GPGPUSamples_0 = ivec2(0, 1);\\\n'+
 *         'const ivec2 GPGPUSamples_1 = ivec2(0, 0);\\\n'+
 *         'const int GPGPUSamples_l = 2;\n'+
 *     '#define GPGPUSamples_i(i) \\\n'+
 *         '((i == 1)? GPGPUSamples_1 \\\n'+
 *         ': GPGPUSamples_0)\n'+
 *     '\n'+
 *     '#define GPGPUTapSamples(out, states, uv) \\\n'+
 *         'vec4 out[GPGPUSamples_l];\\\n'+
 *         'for(int GPGPU_s = 0; GPGPU_s < GPGPUSamples_l; ++GPGPU_s) {\\\n'+
 *             'vec2 GPGPU_d = GPGPUSamples_i(GPGPU_s);\\\n'+
 *             'int GPGPU_t = (GPGPU_d[0]*GPGPUSamples_l)+GPGPU_d[1];\\\n'+
 *             '\\\n'+
 *             'out[GPGPU_s] = texture2D(states[GPGPU_t], uv);\\\n'+
 *         '}\n'+
 *     '\n'+
 *     '#define GPGPUUseReads_0 \\\n'+
 *         'const int GPGPUReads_0_0 = int(0);\\\n'+
 *         'const int GPGPUReads_0_1 = int(1);\\\n'+
 *         'const int GPGPUReads_0_l = 2;\n'+
 *     '#define GPGPUReads_0_i(i) \\\n'+
 *         '((i == 1)? GPGPUReads_0_1 \\\n'+
 *         ': GPGPUReads_0_0)\n';
 *
 *     ++state.pass;
 *     state.macros = 'draw';
 *     state.steps.push(null);
 *     Object.assign(state.maps,
 *         mapSamples([[1, 0], , [2, [1, 0]]], mapGroups([4, 2, 3, 1], 2, 4)));
 *
 *     macroPass(state); // =>
 *     '#define drawTexture_0 0\n'+
 *     '#define drawChannels_0 rgba\n'+
 *     '\n'+
 *     '#define drawTexture_1 1\n'+
 *     '#define drawChannels_1 rg\n'+
 *     '\n'+
 *     '#define drawTexture_2 2\n'+
 *     '#define drawChannels_2 rgb\n'+
 *     '\n'+
 *     '#define drawTexture_3 2\n'+
 *     '#define drawChannels_3 a\n'+
 *     '\n'+
 *     '#define drawTextures 3\n'+
 *     '#define drawPasses 2\n'+
 *     '#define drawSteps 3\n'+
 *     '\n'+
 *     '#define drawPass 1\n'+
 *     '\n'+
 *     '#define drawBound_2 2\n'+
 *     '#define drawAttach_2 0\n'+
 *     '#define drawOutput_2 gl_FragData[drawAttach_2].rgb\n'+
 *     '\n'+
 *     '#define drawBound_3 2\n'+
 *     '#define drawAttach_3 0\n'+
 *     '#define drawOutput_3 gl_FragData[drawAttach_3].a\n'+
 *     '\n'+
 *     '#define drawUseSamples \\\n'+
 *         'const ivec2 drawSamples_0 = ivec2(0, 2);\\\n'+
 *         'const ivec2 drawSamples_1 = ivec2(1, 0);\\\n'+
 *         'const int drawSamples_l = 2;\n'+
 *     '#define drawSamples_i(i) \\\n'+
 *         '((i == 1)? drawSamples_1 \\\n'+
 *         ': drawSamples_0)\n'+
 *     '\n'+
 *     '#define drawTapSamples(out, states, uv) \\\n'+
 *         'vec4 out[drawSamples_l];\\\n'+
 *         'for(int draw_s = 0; draw_s < drawSamples_l; ++draw_s) {\\\n'+
 *             'vec2 draw_d = drawSamples_i(draw_s);\\\n'+
 *             'int draw_t = (draw_d[0]*drawSamples_l)+draw_d[1];\\\n'+
 *             '\\\n'+
 *             'out[draw_s] = texture2D(states[draw_t], uv);\\\n'+
 *         '}\n'+
 *     '\n'+
 *     '#define drawUseReads_2 \\\n'+
 *         'const int drawReads_2_0 = int(0);\\\n'+
 *         'const int drawReads_2_1 = int(1);\\\n'+
 *         'const int drawReads_2_l = 2;\n'+
 *     '#define drawReads_2_i(i) \\\n'+
 *         '((i == 1)? drawReads_2_1 \\\n'+
 *         ': drawReads_2_0)\n';
 *
 * @export
 * @param {object} state Properties for generating the macros. See `getState`
 *     and `mapGroups`.
 * @param {string} [qualify='const'] Any GLSL qualifier (e.g: `const`) for the
 *     generated variables. See `getGLSLList`.
 * @param {number} [glsl=1] The GLSL language version. See `getGLSLList`.
 * @param {boolean} [loop=true] Whether to generate GLSL preprocessor macros for
 *     some of the lookup logic.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for
 *     values, textures, channels, bound outputs of the active pass, etc.
 */
export function macroPass(state, qualify, glsl, loop) {
    const key = 'pass';
    const created = checkMacros(state, key);

    if(created !== false) { return created; }

    return macroValues(state)+'\n'+macroOutput(state)+'\n'+
        macroSamples(state, qualify, glsl, loop);
}

export default macroPass;
