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

export const channelsMap = 'rgba';
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
 *     'const int list_count = 3;\n'+
 *     '#define list_at(i) list[i]\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {(array.<number>|array.<array.<number>>)} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 *
 * @returns {string} The GLSL 3 array declaration string.
 */
export const getGLSL3List = (type, name, a, qualify = '') =>
    `${(qualify && qualify+' ')+type} ${name}[${a.length}] = `+
            `${type}[${a.length}](${
                reduce((out, v, i) =>
                    out+`${type}(${((Array.isArray(v))? v.join(', ') : v)})`+
                        ((i < a.length-1)? ', ' : ''),
                a, '')
            });\\\n`+
    `const int ${name}_count = ${a.length};\n`+
    `#define ${name}_at(i) ${name}[i]\n`;

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
 *     'const int list_count = 3;\n'+
 *     '#define list_at(i) list[i]\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {(array.<number>|array.<array.<number>>)} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 *
 * @returns {string} The GLSL 1 array declaration string.
 */
export const getGLSL1ListArray = (type, name, a, qualify = '') =>
    `${(qualify && qualify+' ')+type} ${name}[${a.length}];\\\n`+
    reduce((s, v, i) =>
            `${s+name}[${i}] = ${type}(${
                ((Array.isArray(v))? v.join(', ') : v)});\\\n`,
        a, '')+
    `const int ${name}_count = ${a.length};\n`+
    `#define ${name}_at(i) ${name}[i]\n`;

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
 *     'const int list_count = 3;\n'+
 *     '#define list_at(i) \\\n'+
 *         '((i == 2)? list_2\\\n'+
 *         ': ((i == 1)? list_1\\\n'+
 *         ': list_0))\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {(array.<number>|array.<array.<number>>)} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 *
 * @returns {string} The GLSL 1 array-like declaration string.
 */
export const getGLSL1ListLike = (type, name, a, qualify = '') =>
    reduce((s, v, i) =>
            `${s+(qualify && qualify+' ')+type} ${name}_${i} = `+
                `${type}(${((Array.isArray(v))? v.join(', ') : v)});\\\n`,
        a, '')+
    `const int ${name}_count = ${a.length};\n`+
    // `#define ${name}_at(i) ${name}_##i\\\n`;
    `#define ${name}_at(i) \\\n${
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
 *     'const int test_count = 2;\n'+
 *     '#define test_at(i) test[i]\n';
 *
 *     getGLSLList('ivec2', 'vectors', [[0, 1], [0, 0]], 'const', 3); // =>
 *     'const ivec2 vectors[2] = ivec2[2](ivec2(0, 1), ivec2(0, 0));\\\n'+
 *     'const int vectors_count = 2;\n'+
 *     '#define vectors_at(i) vectors[i]\n';
 *
 *     getGLSLList('int', 'listLike', [0, 1], 'const', 1); // =>
 *     'const int listLike_0 = int(0);\\\n'+
 *     'const int listLike_1 = int(1);\\\n'+
 *     'const int listLike_count = 2;\n'+
 *     '#define listLike_at(i) \\\n'+
 *         '((i == 1)? listLike_1\\\n'+
 *         ': listLike_0)\n';
 *
 * @export
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {(array.<number>|array.<array.<number>>)} a The list of GLSL values.
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
 *         ...mapSamples([[1, 0], , [3, [1, 0]]], mapGroups([4, 2, 1], 1, 4)),
 *         pass: 0
 *     }); // =>
 *     '#define GPGPUUseSamples \\\n'+
 *         'const ivec2 GPGPUSamples_0 = ivec2(0, 1);\\\n'+
 *         'const ivec2 GPGPUSamples_1 = ivec2(0, 0);\\\n'+
 *         'const int GPGPUSamples_count = 2;\n'+
 *     '#define GPGPUSamples_at(i) \\\n'+
 *         '((i == 1)? GPGPUSamples_1 \\\n'+
 *         ': GPGPUSamples_0)\n'+
 *     '\n'+
 *     '#define GPGPUTapSamples(out, states, uv) \\\n'+
 *         'vec4 out[GPGPUSamples_count];\\\n'+
 *         'for(int GPGPU_i = 0; GPGPU_i < GPGPUSamples_count; ++GPGPU_i) {'+
 *         '\\\n'+
 *             'vec2 GPGPU_d = GPGPUSamples_at(GPGPU_i);\\\n'+
 *             'int GPGPU_t = (GPGPU_d[0]*2)+GPGPU_d[1];\\\n'+
 *             '\\\n'+
 *             'out[GPGPU_i] = texture2D(states[GPGPU_t], uv);\\\n'+
 *         '}\n'+
 *     '\n'+
 *     '#define GPGPUUseReads_0 \\\n'+
 *         'const int GPGPUReads_0_0 = int(0);\\\n'+
 *         'const int GPGPUReads_0_1 = int(1);\\\n'+
 *         'const int GPGPUReads_0_count = 2;\n'+
 *     '#define GPGPUReads_0_at(i) \\\n'+
 *         '((i == 1)? GPGPUReads_0_1 \\\n'+
 *         ': GPGPUReads_0_0)\n';
 *
 * @param {object.<number, array.<array.<array>>, array.<array.<array>>>} props
 *     The properties used to generate the preprocessor macros:
 * @param {(string|function|object|falsey)} [props.macros=macrosDef] How
 *     macros should be generated (see `checkMacros`).
 * @param {number} props.pass The index of the currently active pass.
 * @param {array.<array.<array.<number>>>} props.samples The minimal set of
 *     texture samples to use (see `mapSamples`);
 * @param {array.<array.<array.<number>>>} props.reads The mappings from values
 *     to the corresponding `props.samples` (see `mapSamples`).
 * @param {number} props.textures.length How many textures to read from (see
 *     `mapGroups`).
 * @param {string} [qualify='const'] Any GLSL qualifier (e.g: `const`) for the
 *     generated variables (see `getGLSLList`).
 * @param {number} [glsl=1] The GLSL language version (see `getGLSLList`).
 * @param {boolean} [loop=true] Whether to generate GLSL preprocessor macros for
 *     some of the lookup logic.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for
 *     samples and reads, for each value.
 */
export function macroSamples(props, qualify = 'const', glsl = 1, loop = true) {
    const key = 'samples';
    const created = checkMacros(props);

    if(created !== false) { return created; }

    const {
            macros: m = macrosDef, pass, samples, reads,
            textures: { length: texturesL }
        } = props;

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
                `vec4 out[${m}Samples_count];\\\n`+
                `for(int ${m}_i = 0; ${m}_i < ${m}Samples_count; ++${m}_i) {`+
                    '\\\n'+
                    `vec2 ${m}_d = ${m}Samples_at(${m}_i);\\\n`+
                    `int ${m}_t = (${m}_d[0]*${texturesL})+${m}_d[1];\\\n`+
                    '\\\n'+
                    `out[${m}_i] = texture2D(states[${m}_t], uv);\\\n`+
                '}\n'))+
        ((!passReads)? ''
        :   reduce((out, valueReads, v) =>
                out+`\n#define ${m}UseReads_${v} \\\n${
                    getGLSLList('int', `${m}Reads_${v}`, valueReads, qualify,
                        glsl)
                }`,
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
 *          ...mapGroups([4, 2, 1], 1, 4), pass: 0, steps: Array(2)
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
 * @param {object.<array.<number>, array.<array.<number>>>} props Properties
 *     used to generate the macros (see `getState`).
 * @param {(string|function|object|falsey)} [props.macros=macrosDef] How macros
 *     should be generated (see `checkMacros`).
 * @param {array.<number>} props.values How values of each data item may be
 *     grouped into textures (see `getState`).
 * @param {array.<array.<number>>} props.textures The groupings of values into
 *     textures (see `mapGroups`).
 * @param {number} props.steps.length The number of states to be drawn across
 *     frames (see `getState`).
 * @param {number} props.passes.length The number of passes to be drawn across
 *     steps (see `getState`).
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings from
 *     values to textures/channels.
 */
export function macroValues(props) {
    const key = 'values';
    const created = checkMacros(props, key);

    if(created !== false) { return created; }

    const {
            macros: m = macrosDef, values, textures,
            steps: { length: stepsL },
            passes: { length: passesL }
        } = props;

    const c = key+':'+JSON.stringify({ m, values, textures, stepsL, passesL });

    return (cache[c] || (cache[c] =
        reduce((out, texture, b) => {
                let sum = 0;

                return reduce((out, v) => out+
                        `#define ${m}Texture_${v} ${b}\n`+
                        `#define ${m}Channels_${v} ${
                            channelsMap.slice(sum, sum += values[v])
                        }\n\n`,
                    texture, out);
            },
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
 *     const props = { ...mapGroups([4, 2, 1], 1, 4), pass: 0 };
 *
 *     macroOutput(props); // =>
 *     '#define GPGPUPass 0\n'+
 *     '\n'+
 *     '#define GPGPUBound_0 0\n'+
 *     '#define GPGPUOutput_0 gl_FragData[0].rgba\n';
 *
 *     ++props.pass;
 *
 *     macroOutput(props); // =>
 *     '#define GPGPUPass 1\n'+
 *     '\n'+
 *     '#define GPGPUBound_1 1\n'+
 *     '#define GPGPUOutput_1 gl_FragData[0].rg\n'+
 *     '\n'+
 *     '#define GPGPUBound_2 1\n'+
 *     '#define GPGPUOutput_2 gl_FragData[0].b\n';
 *
 * @export
 * @param {object} props Properties for generating the macros (see `getState`):
 * @param {(string|function|object|falsey)} [props.macros=macrosDef] How macros
 *     should be generated (see `checkMacros`).
 * @param {number} props.pass The index of the currently active pass.
 * @param {array.<number>} props.values How values of each data item may be
 *     grouped into textures across passes (see `getState`).
 * @param {array.<array.<number>>} props.textures The groupings of values into
 *     textures (see `mapGroups`).
 * @param {array.<array.<number>>} props.passes The groupings of textures into
 *     passes (see `mapGroups`).
 *
 * @returns {string} The GLSL preprocessor macros defining the bound outputs.
 */
export function macroOutput(props) {
    const key = 'draw';
    const created = checkMacros(props, key);

    if(created !== false) { return created; }

    const { macros: m = macrosDef, pass: p, values, textures, passes } = props;
    const pass = passes[p];
    const c = key+':'+JSON.stringify({ m, p, values, textures, passes });

    return (cache[c] || (cache[c] =
        `#define ${m}Pass ${p}\n`+
        reduce((out, texture, bound) => {
                let sum = 0;

                return reduce((out, v) => out+'\n'+
                        `#define ${m}Bound_${v} ${texture}\n`+
                        `#define ${m}Output_${v} gl_FragData[${bound}].${
                            channelsMap.slice(sum, sum += values[v])
                        }\n`,
                    textures[texture], out);
            },
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
 * @see macroSamples
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     const props = {
 *         ...mapSamples([[1, 0], [2, [1, 0]]], mapGroups([4, 2, 3], 1, 4)),
 *         steps: [, , ], pass: 0
 *     };
 *
 *     macroPass(props); // =>
 *     '#define GPGPUUseSamples \\\n'+
 *         'const ivec2 GPGPUSamples_0 = ivec2(0, 1);\\\n'+
 *         'const ivec2 GPGPUSamples_1 = ivec2(0, 0);\\\n'+
 *         'const int GPGPUSamples_count = 2;\n'+
 *     '#define GPGPUSamples_at(i) \\\n'+
 *         '((i == 1)? GPGPUSamples_1 \\\n'+
 *         ': GPGPUSamples_0)\n'+
 *     '\n'+
 *     '#define GPGPUTapSamples(out, states, uv) \\\n'+
 *         'vec4 out[GPGPUSamples_count];\\\n'+
 *         'for(int GPGPU_i = 0; GPGPU_i < GPGPUSamples_count; ++GPGPU_i) {\\\n'+
 *             'vec2 GPGPU_d = GPGPUSamples_at(GPGPU_i);\\\n'+
 *             'int GPGPU_t = (GPGPU_d[0]*3)+GPGPU_d[1];\\\n'+
 *             '\\\n'+
 *             'out[GPGPU_i] = texture2D(states[GPGPU_t], uv);\\\n'+
 *         '}\n'+
 *     '\n'+
 *     '#define GPGPUUseReads_0 \\\n'+
 *         'const int GPGPUReads_0_0 = int(0);\\\n'+
 *         'const int GPGPUReads_0_1 = int(1);\\\n'+
 *         'const int GPGPUReads_0_count = 2;\n'+
 *     '#define GPGPUReads_0_at(i) \\\n'+
 *         '((i == 1)? GPGPUReads_0_1 \\\n'+
 *         ': GPGPUReads_0_0)\n'+
 *     '\n'+
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
 *     '#define GPGPUOutput_0 gl_FragData[0].rgba\n';
 *
 *     ++props.pass;
 *     props.macros = 'draw';
 *     props.steps.push(null);
 *     Object.assign(props,
 *         mapSamples([[1, 0], , [2, [1, 0]]], mapGroups([4, 2, 3, 1], 2, 4)));
 *
 *     macroPass(props); // =>
 *     '#define drawUseSamples \\\n'+
 *         'const ivec2 drawSamples_0 = ivec2(0, 2);\\\n'+
 *         'const ivec2 drawSamples_1 = ivec2(1, 0);\\\n'+
 *         'const int drawSamples_count = 2;\n'+
 *     '#define drawSamples_at(i) \\\n'+
 *         '((i == 1)? drawSamples_1 \\\n'+
 *         ': drawSamples_0)\n'+
 *     '\n'+
 *     '#define drawTapSamples(out, states, uv) \\\n'+
 *         'vec4 out[drawSamples_count];\\\n'+
 *         'for(int draw_i = 0; draw_i < drawSamples_count; ++draw_i) {\\\n'+
 *             'vec2 draw_d = drawSamples_at(draw_i);\\\n'+
 *             'int draw_t = (draw_d[0]*3)+draw_d[1];\\\n'+
 *             '\\\n'+
 *             'out[draw_i] = texture2D(states[draw_t], uv);\\\n'+
 *         '}\n'+
 *     '\n'+
 *     '#define drawUseReads_2 \\\n'+
 *         'const int drawReads_2_0 = int(0);\\\n'+
 *         'const int drawReads_2_1 = int(1);\\\n'+
 *         'const int drawReads_2_count = 2;\n'+
 *     '#define drawReads_2_at(i) \\\n'+
 *         '((i == 1)? drawReads_2_1 \\\n'+
 *         ': drawReads_2_0)\n'+
 *     '\n'+
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
 *     '#define drawOutput_2 gl_FragData[0].rgb\n'+
 *     '\n'+
 *     '#define drawBound_3 2\n'+
 *     '#define drawOutput_3 gl_FragData[0].a\n';
 *
 * @export
 * @param {object} props Properties for generating the macros (see `getState`):
 * @param {(string|function|object|falsey)} [props.macros=macrosDef] How macros
 *     should be generated (see `checkMacros`).
 * @param {number} props.pass The index of the currently active pass.
 * @param {number} props.steps.length The number of states to be drawn across
 *     frames (see `getState`).
 * @param {array.<number>} props.values How values of each data item may be
 *     grouped into textures across passes (see `getState`).
 * @param {array.<array.<number>>} props.textures The groupings of values into
 *     textures (see `mapGroups`).
 * @param {array.<array.<number>>} props.passes The groupings of textures into
 *     passes (see `mapGroups`).
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for
 *     values, textures, channels, bound outputs of the active pass, etc.
 */
export function macroPass(props) {
    const key = 'pass';
    const created = checkMacros(props, key);

    if(created !== false) { return created; }

    return macroSamples(props)+'\n'+macroValues(props)+'\n'+macroOutput(props);
}

export default macroPass;
