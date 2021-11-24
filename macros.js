/**
 * GPGPU GLSL preprocessor macros for each part of the state.
 *
 * Careful defining these, as each set of different macros will result in new
 * shaders and compilations, missing the cache here and in the rendering system.
 * So, as few unique macros as possible should be created for a given set of
 * inputs, for efficiency.
 *
 * @todo Check examples are correct.
 * @todo Consider doing something better with indentation.
 */

import reduce from '@epok.tech/fn-lists/reduce';
import map from '@epok.tech/fn-lists/map';
import { type } from '@epok.tech/is-type/type';

import { preDef, boundDef } from './const';

export const rgba = 'rgba';
export const cache = {};

// Keys for each part of the macro handling process available to hooks.
export const hooks = {
    // The full set of macros.
    macroPass: '',
    // Each part of the set of macros.
    macroValues: 'values', macroOutput: 'output',
    macroSamples: 'samples', macroSamplesTap: 'tap'
};

/**
 * Whether macros should be handled here; or the result of handling them by a
 * given named hook.
 * Allows macros of the given key to be handled by external named hooks, to
 * replace any part of the functionality here.
 *
 * @example
 *     // Macros to be handled here, the default.
 *     hasMacros() === hasMacros({}) === hasMacros({ macros: true }) === null;
 *     // Macros to be handled here, with prefix `'pre_'` instead of `'preDef'`.
 *     hasMacros({ pre: 'pre_' }) === null;
 *     // Macros not created.
 *     hasMacros({ macros: false }) === hasMacros({ macros: 0 }) === '';
 *     // Macros for 'a' handled by external static hook, not here.
 *     hasMacros({ macros: { a: '//A\n', b: () => '//B\n' } }, 'a') === '//A\n';
 *     // Macros for 'b' handled by external function hook, not here.
 *     hasMacros({ macros: { a: '//A\n', b: () => '//B\n' } }, 'b') === '//B\n';
 *     // Macros specified `on` a 'frag' not created.
 *     hasMacros({ macros: { frag: 0 } }, '', 'frag') === '';
 *     // Macros specified `on` a 'vert' handled here.
 *     hasMacros({ macros: { frag: 0, a_vert: 0 } }, '', 'vert') === null;
 *     // Macros for hook `'a'` specified `on` a 'vert' not created.
 *     hasMacros({ macros: { frag: 0, a_vert: 0 } }, 'a', 'vert') === '';
 *
 * @param {object} [props] The properties handling macros.
 * @param {string} [key] The name for which macros should be handled.
 * @param {string} [on=''] Any further macro `hooks` specifier; if given, both
 *     the hook key and this specifier are checked (e.g: `key` and `key_on`).
 * @param {string|function|object|false} [macros=props.macros] Whether and how
 *     GLSL preprocessor macros should be handled:
 *     - If it's falsey and non-nullish, no macros are handled here.
 *     - If it's a string, no macros are handled here as it's used instead.
 *     - If it's a function, it's passed the given `props`, `key`, `macros`, and
 *         the returned result is interpreted in the same way as described.
 *     - If it's an object, any value at the given `key` is entered recursively,
 *         with the given `props`, `key`, and `macros[key]`.
 *     - Otherwise, returns `null` to indicate macros should be handled here.
 *
 * @returns {string|null|*} Either the result of the macros handled elsewhere,
 *     or `null` if macros should be handled here.
 */
export function hasMacros(props, key, on = '', macros = props?.macros) {
    if((macros ?? true) === true) { return null; }
    else if(!macros) { return ''; }

    const t = type(macros);

    return ((t === 'Function')? macros(props, key, on, macros)
        : ((t === 'String')? macros
        : (((macros instanceof Object) && (key in macros))?
            hasMacros(props, key, on, macros[key])
        : ((on)? hasMacros(props, (key || '')+(key && on && '_')+on, '', macros)
        :   null))));
}

/**
 * Generates an array-like declaration, as a GLSL syntax string compatible with
 * all versions.
 * Workaround for lack of `const` arrays in GLSL < 3.
 * Used as the base for the other GLSL version list types, ensuring a standard
 * basis while offering further language features where available.
 *
 * @export
 * @example
 *     getGLSLListBase('float', 'list', [0, 1, 2], 'const'); // =>
 *     'const int list_l = 3; '+
 *     'const int list_0 = float(0); '+
 *     'const int list_1 = float(1); '+
 *     'const int list_2 = float(2);';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array<number,array<number>>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 * @param {string} [init=type] A data-type initialiser, `type` by default.
 *
 * @returns {string} The GLSL 1 array-like declaration string.
 */
export const getGLSLListBase = (type, name, a, qualify = '', init = type) =>
    `const int ${name}_l = ${a.length};`+
    reduce((s, v, i) =>
            `${s} ${(qualify && qualify+' ')+type} ${name}_${i} = ${
                init}(${v.join?.(', ') ?? v});`,
        a, '');

/**
 * Generates an array-like declaration, as a GLSL 1 syntax string.
 * Workaround for lack of `const` arrays in GLSL < 3.
 * Adds a lookup macro function; slow here, but standard.
 *
 * @export
 * @example
 *     getGLSL1ListLike('float', 'list', [0, 1, 2], 'const'); // =>
 *     'const int list_l = 3; '+
 *     'const int list_0 = float(0); '+
 *     'const int list_1 = float(1); '+
 *     'const int list_2 = float(2);\n'+
 *     '// `list_i` index macro (e.g: `list_i(0)`) may be slow, `+
 *         'prefer direct reference (e.g: `list_0`) where possible.\n'+
 *     '#define list_i(i) ((i == 2)? list_2 : ((i == 1)? list_1 : list_0))\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array<number,array<number>>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 * @param {string} [init=type] A data-type initialiser, `type` by default.
 *
 * @returns {string} The GLSL 1 array-like declaration string.
 */
export const getGLSL1ListLike = (type, name, a, qualify = '', init = type) =>
    getGLSLListBase(type, name, a, qualify, init)+'\n'+
    // `#define ${name}_i(i) ${name}_##i`;
    `// \`${name}_i\` index macro (e.g: \`${name}_i(0)\`) may be slow, `+
        `prefer direct reference (e.g: \`${name}_0\`) where possible.\n`+
    `#define ${name}_i(i) ${reduce((s, v, i) =>
            ((i)? `((i == ${i})? ${name}_${i} : ${s})` : `${name}_${i}`),
        a, '')}\n`;

/**
 * Generates an array declaration, as a GLSL 1 syntax string.
 * Lookup and meta macros are added for consistency with other versions.
 *
 * @export
 * @example
 *     getGLSL1ListArray('vec3', 'list', [[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
 *     // =>
 *     'const int list_l = 3; '+
 *     'vec3 list_0 = vec3(1, 0, 0); '+
 *     'vec3 list_1 = vec3(0, 2, 0); '+
 *     'vec3 list_2 = vec3(0, 0, 3); '+
 *     'vec3 list[list_l]; '+
 *     'list[0] = list_0; '+
 *     'list[1] = list_1; '+
 *     'list[2] = list_2;\n'+
 *     '#define list_i(i) list[i]\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array<number,array<number>>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 * @param {string} [init=type] A data-type initialiser, `type` by default.
 *
 * @returns {string} The GLSL 1 array declaration string.
 */
export const getGLSL1ListArray = (type, name, a, qualify = '', init = type) =>
    getGLSLListBase(type, name, a, qualify, init)+' '+
    (qualify && qualify+' ')+`${type} ${name}[${name}_l];`+
    reduce((s, _, i) => `${s} ${name}[${i}] = ${name}_${i};`, a, '')+'\n'+
    `#define ${name}_i(i) ${name}[i]\n`;

/**
 * Generates an array declaration, as a GLSL 3 syntax string.
 * Lookup and meta macros are added for consistency with other versions.
 *
 * @export
 * @example
 *     getGLSL3List('int', 'list', [0, 1, 2], 'const'); // =>
 *     'const int list_l = 3; '+
 *     'const int list_0 = int(0); '+
 *     'const int list_1 = int(1); '+
 *     'const int list_2 = int(2); '+
 *     'const int list[list_l] = int[list_l](list_0, list_1, list_2);\n'+
 *     '#define list_i(i) list[i]\n';
 *
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array<number,array<number>>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed.
 * @param {string} [init=type] A data-type initialiser, `type` by default.
 *
 * @returns {string} The GLSL 3 array declaration string.
 */
export const getGLSL3List = (type, name, a, qualify = '', init = type) =>
    getGLSLListBase(type, name, a, qualify, init)+' '+
    `${(qualify && qualify+' ')+type} ${name}[${name}_l] = ${init}[${name}_l](${
        reduce((s, _, i) => (s && s+', ')+name+'_'+i, a, '')});\n`+
    `#define ${name}_i(i) ${name}[i]\n`;

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
 *     'const int test_l = 2; '+
 *     'int test_0 = int(0); '+
 *     'int test_1 = int(1); '+
 *     'int test[test_l]; '+
 *     'test[0] = test_0; '+
 *     'test[1] = test_1;\n'+
 *     '#define test_i(i) test[i]\n';
 *
 *     getGLSLList('ivec2', 'vecs', [[1, 0], [0, 1]], 'const', 3); // =>
 *     'const int vecs_l = 2; '+
 *     'ivec2 vecs_0 = ivec2(1, 0); '+
 *     'ivec2 vecs_1 = ivec2(0, 1); '+
 *     'const ivec2 vecs[vecs_l] = ivec2[vecs_l](vecs_0, vecs_1);\n'+
 *     '#define vecs_i(i) vecs[i]\n';
 *
 *     getGLSLList('int', 'listLike', [0, 1], 'const', 1); // =>
 *     'const int listLike_l = 2; '+
 *     'const int listLike_0 = int(0); '+
 *     'const int listLike_1 = int(1);\n'+
 *     '// `listLike_i` index macro (e.g: `listLike_i(0)`) may be slow, `+
 *         'prefer direct reference (e.g: `listLike_0`) where possible.\n'+
 *     '#define listLike_i(i) ((i == 1)? listLike_1 : listLike_0)\n';
 *
 * @export
 * @param {string} type The GLSL list data-type.
 * @param {string} name The name of the GLSL list variable.
 * @param {array<number,array<number>>} a The list of GLSL values.
 * @param {string} [qualify=''] A GLSL qualifier, if needed (e.g: `const`).
 * @param {number} [glsl=1] The GLSL version to target, if specified.
 * @param {string} [init] A data-type initialiser.
 *
 * @returns {string} The GLSL (1 or 3) array or array-like declaration string.
 */
export const getGLSLList = (type, name, a, qualify = '', glsl = 1, init) =>
    ((glsl >= 3)? getGLSL3List
    : ((qualify.trim() === 'const')? getGLSL1ListLike
    :   getGLSL1ListArray))(type, name, a, qualify, init);

/**
 * Defines the values within textures per-step, as GLSL preprocessor macros.
 * These macros define mappings from values to their textures and channels.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see hasMacros
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     macroValues({
 *         steps: Array(2),
 *         maps: mapGroups({ values: [4, 2, 1], texturesMax: 1 })
 *     }); // =>
 *     '#define texture_0 0\n'+ // Value 0's texture.
 *     '#define channels_0 rgba\n'+ // Value 0's channels.
 *     '\n'+
 *     '#define texture_1 1\n'+ // Value 1's texture.
 *     '#define channels_1 rg\n'+ // Value 1's channels.
 *     '\n'+
 *     '#define texture_2 1\n'+ // Value 2's texture.
 *     '#define channels_2 b\n'+ // Value 2's channels.
 *     '\n'+
 *     // General metadata.
 *     '#define textures 2\n'+
 *     '#define passes 2\n'+
 *     '#define stepsPast 1\n'+
 *     '#define steps 2\n';
 *
 * @export
 * @param {object} state Properties used to generate the macros. See `getState`.
 * @param {string} [on] Any further macro `hooks` specifier; if given, both
 *     the hook key and this specifier are checked (e.g: `key` and `key_on`).
 * @param {string|function|object|false} [state.macros] How macros are handled
 *     or prefixed. See `hasMacros`.
 * @param {string} [state.pre=preDef] Macros prefix; `preDef` if not given.
 * @param {object} state.maps How values are grouped per-texture per-pass
 *     per-step.
 * @param {array<number>} state.maps.values How values of each data item are
 *     grouped into textures. See `mapGroups`.
 * @param {array<array<number>>} state.maps.textures The groupings of values
 *     into textures. See `mapGroups`.
 * @param {array} state.maps.passes The passes drawn per-step. See `mapGroups`.
 * @param {array} state.steps The states drawn across frames. See `getState`.
 * @param {number} [state.bound=boundDef] How many steps are bound as outputs,
 *     unavailable as inputs.
 * @param {object} [state.size] Any size information about the GL resources.
 * @param {number} [state.size.count] The number of data entries per texture
 *     (the texture's area), if given. See `getState`.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings from
 *     values to textures/channels.
 */
export function macroValues(state, on) {
    const key = hooks.macroValues;
    const hook = hasMacros(state, key, on);

    if(hook !== null) { return hook; }

    const { maps, steps, bound = boundDef, size, pre: n = preDef } = state;
    const { values, textures, passes: { length: passesL } } = maps;
    const stepsL = steps.length;
    const count = size?.count;

    const c = key+':'+
        JSON.stringify({ n, bound, values, textures, stepsL, passesL, count });

    return (cache[c] ??=
        reduce((s, texture, t, _, i = 0) => reduce((s, v) => s+
                    `#define ${n}texture_${v} ${t}\n`+
                    `#define ${n}channels_${v} ${
                        rgba.slice(i, (i += values[v]))}\n\n`,
                texture, s),
            textures, '')+
        ((count)? `#define count ${count}\n` : '')+
        `#define ${n}textures ${textures.length}\n`+
        `#define ${n}passes ${passesL}\n`+
        `#define ${n}stepsPast ${stepsL-bound}\n`+
        `#define ${n}steps ${stepsL}\n`);
}

/**
 * Defines the outputs being drawn to per-pass, as GLSL preprocessor macros.
 * These macros define mappings from values to their outputs, if bound.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see hasMacros
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     const state = {
 *         passNow: 0, maps: mapGroups({ values: [4, 2, 1], texturesMax: 1 })
 *     };
 *
 *     macroOutput(state); // =>
 *     '#define passNow 0\n'+
 *     '\n'+
 *     '#define bound_0 0\n'+
 *     '#define attach_0 0\n'+
 *     '#define output_0 gl_FragData[attach_0].rgba\n';
 *
 *     ++state.passNow;
 *
 *     macroOutput(state); // =>
 *     '#define passNow 1\n'+
 *     '\n'+
 *     '#define bound_1 1\n'+
 *     '#define attach_1 0\n'+
 *     '#define output_1 gl_FragData[attach_1].rg\n'+
 *     '\n'+
 *     '#define bound_2 1\n'+
 *     '#define attach_2 0\n'+
 *     '#define output_2 gl_FragData[attach_2].b\n';
 *
 * @export
 * @param {object} state Properties for generating the macros. See `getState`:
 * @param {string} [on] Any further macro `hooks` specifier; if given, both
 *     the hook key and this specifier are checked (e.g: `key` and `key_on`).
 * @param {string|function|object|false} [state.macros] How macros are handled.
 *     See `hasMacros`.
 * @param {string} [state.pre=preDef] Macros prefix; `pre` if not given.
 * @param {number} state.passNow The index of the currently active pass.
 * @param {object} state.maps How values are grouped per-texture per-pass
 *     per-step. See `mapGroups`.
 * @param {array<number>} state.maps.values How values of each data item may be
 *     grouped into textures across passes. See `mapGroups`.
 * @param {array<array<number>>} state.maps.textures The groupings of values
 *     into textures. See `mapGroups`.
 * @param {array<array<number>>} state.maps.passes The groupings of textures
 *     into passes. See `mapGroups`.
 *
 * @returns {string} The GLSL preprocessor macros defining the bound outputs.
 */
export function macroOutput(state, on) {
    const key = hooks.macroOutput;
    const hook = hasMacros(state, key, on);

    if(hook !== null) { return hook; }

    const { passNow: p, maps, pre: n = preDef } = state;
    const { values, textures, passes } = maps;
    const pass = passes[p];
    const c = key+':'+JSON.stringify({ n, p, values, textures, passes });

    return (cache[c] ??=
        `#define ${n}passNow ${p}\n`+
        reduce((s, texture, bound, _, i = 0) => reduce((s, v) => `${s}\n`+
                    `#define ${n}bound_${v} ${texture}\n`+
                    `#define ${n}attach_${v} ${bound}\n`+
                    `#define ${n}output_${v} gl_FragData[${n}attach_${v}].${
                        rgba.slice(i, (i += values[v]))}\n`,
                textures[texture], s),
            pass, ''));
}

/**
 * Defines the texture samples/reads per-pass, as GLSL preprocessor macros.
 * The macros define the mapping between the values and the minimum texture
 * samples for the data they derive from. They're set up as function-like macros
 * that may be called from the shader to initialise the mappings arrays with a
 * given name.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see hasMacros
 * @see getGLSLList
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [mapSamples]{@link ./maps.js#mapSamples}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     macroSamples({
 *         passNow: 0,
 *         maps: mapSamples(mapGroups({
 *             values: [4, 2, 1], channelsMax: 4, texturesMax: 1,
 *             derives: [[1, 0], , [3, [1, 0]]]
 *         }))
 *     }); // =>
 *     '#define useSamples '+
 *         'const int samples_l = 2; '+
 *         'const ivec2 samples_0 = ivec2(0, 1); '+
 *         'const ivec2 samples_1 = ivec2(0, 0);\n'+
 *     '// `samples_i` index macro (e.g: `samples_i(0)`) may be slow, `+
 *         'prefer direct reference (e.g: `samples_0`) where possible.\n'+
 *     '#define samples_i(i) ((i == 1)? samples_1 : samples_0)\n'+
 *     '\n'+
 *     '#define tapSamples(states, uv, textures, by) '+
 *         'const int data_l = 2; '+
 *         'vec4 data[data_l]; '+
 *         'data[0] = texture2D('+
 *             'states[((samples_0.s+by.s)*textures)+samples_0.t+by.t], uv); '+
 *         'data[1] = texture2D('+
 *             'states[((samples_1.s+by.s)*textures)+samples_1.t+by.t], uv); '+
 *         '// `data_i` index macro (e.g: `data_i(0)`) may be slow, `+
 *             'prefer direct reference (e.g: `data_0`) where possible.\n'+
 *         '#define data_i(i) data[i]\n'+
 *     '#define tapSamples(states, uv, textures) '+
 *         'tapSamplesShift(states, uv, textures, ivec2(0))\n'+
 *     '\n'+
 *     '#define useReads_0 '+
 *         'const int reads_0_l = 2; '+
 *         'const int reads_0_0 = int(0); '+
 *         'const int reads_0_1 = int(1);\n'+
 *     '// `reads_0_i` index macro (e.g: `reads_0_i(0)`) may be slow, `+
 *         'prefer direct reference (e.g: `reads_0_0`) where possible.\n'+
 *     '#define reads_0_i(i) ((i == 1)? reads_0_1 : reads_0_0)\n';
 *
 * @param {object} state Properties used to generate the macros. See `getState`.
 * @param {string} [on] Any further macro `hooks` specifier; if given, both
 *     the hook key and this specifier are checked (e.g: `key` and `key_on`).
 * @param {string|function|object|false} [state.macros] How macros are handled.
 *     See `hasMacros`.
 * @param {string} [state.pre=preDef] Macros prefix; `preDef` if not given.
 * @param {number} state.passNow The index of the currently active pass.
 * @param {object} state.maps  How `values` are grouped per-texture per-pass
 *     per-step. See `mapGroups`.
 * @param {array<array<array<number>>>} [state.maps.samples] The minimal set of
 *     texture samples to use. See `mapSamples`.
 * @param {array<array<array<number>>>} [state.maps.reads] The mappings from
 *     values to the corresponding `state.samples`. See `mapSamples`.
 * @param {number} [state.glsl=1] The GLSL language version. See `getGLSLList`.
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for
 *     samples and reads, for each value.
 */
export function macroSamples(state, on) {
    const key = hooks.macroSamples;
    const hook = hasMacros(state, key, on);

    if(hook !== null) { return hook; }

    const { passNow: p = 0, maps, glsl, pre: n = preDef } = state;
    const { samples, reads } = maps;
    const passSamples = samples?.[p];
    const passReads = reads?.[p];
    // Whether to generate GLSL preprocessor macros for the lookup logic.
    const tap = hasMacros(state, hooks.macroSamplesTap, on);

    const c = key+':'+
        JSON.stringify({ n, p, passSamples, passReads, glsl, tap });

    return (cache[c] ??=
        ((!passSamples)? ''
        :   `#define ${n}useSamples ${
                getGLSLList('ivec2', n+'samples', passSamples, 'const', glsl)
            }\n`+
            // The texture-sampling logic.
            (tap ??
                // Data may be sampled by adding step/texture lookup shifts.
                `#define ${n}tapSamplesShift(states, uv, textures, by) ${
                    // 2D-to-1D indexing, as textures are a flat array.
                    getGLSLList('vec4', n+'data',
                        map((_, s) =>
                                'texture2D(states['+
                                        `((${n}samples_${s}.s+by.s)*textures)+`+
                                        `${n}samples_${s}.t+by.t`+
                                    '], uv)',
                            passSamples),
                        '', glsl)}\n`+
                // Data is usually sampled without step/texture lookup shifts.
                `#define ${n}tapSamples(states, uv, textures) `+
                    n+'tapSamplesShift(states, uv, textures, ivec2(0))\n\n'))+
        ((!passReads)? ''
        :   reduce((s, reads, v) =>
                    `${s}#define ${n}useReads_${v} ${
                        getGLSLList('int', n+'reads_'+v, reads, 'const', glsl)
                    }\n`,
                passReads, '')));
}

/**
 * Defines all GLSL preprocessor macro values, texture samples, and outputs for
 * the active pass.
 * The macros define the mapping between the active values, their textures and
 * channels, bound outputs, and other macros useful for a draw pass.
 * Caches the result if `macros` generation is enabled, to help reuse shaders.
 *
 * @see hasMacros
 * @see macroValues
 * @see macroOutput
 * @see macroSamples
 * @see [mapGroups]{@link ./maps.js#mapGroups}
 * @see [getState]{@link ./state.js#getState}
 *
 * @example
 *     const state = {
 *         steps: Array(2), passNow: 0,
 *         maps: mapSamples(mapGroups({
 *             values: [4, 2, 3], channelsMax: 4, texturesMax: 1,
 *             derives: [[1, 0], [2, [1, 0]]]
 *         }))
 *     };
 *
 *     macroPass(state); // =>
 *     '#define texture_0 0\n'+
 *     '#define channels_0 rgba\n'+
 *     '\n'+
 *     '#define texture_1 1\n'+
 *     '#define channels_1 rg\n'+
 *     '\n'+
 *     '#define texture_2 2\n'+
 *     '#define channels_2 rgb\n'+
 *     '\n'+
 *     '#define textures 3\n'+
 *     '#define passes 3\n'+
 *     '#define steps 2\n'+
 *     '\n'+
 *     '#define passNow 0\n'+
 *     '\n'+
 *     '#define bound_0 0\n'+
 *     '#define attach_0 0\n'+
 *     '#define output_0 gl_FragData[attach_0].rgba\n'+
 *     '\n'+
 *     '#define useSamples '+
 *         'const int samples_l = 2; '+
 *         'const ivec2 samples_0 = ivec2(0, 1); '+
 *         'const ivec2 samples_1 = ivec2(0, 0);\n'+
 *     '#define samples_i(i) ((i == 1)? samples_1 : samples_0)\n'+
 *     '\n'+
 *     '#define tapSamples(states, uv, textures) '+
 *         'const int data_l = 2; '+
 *         'vec4 data[data_l]; '+
 *         'data[0] = texture2D(states[(0*textures)+1], uv); '+
 *         'data[1] = texture2D(states[(0*textures)+0], uv);\n'+
 *         '#define data_i(i) data[i]\n'+
 *     '\n'+
 *     '#define useReads_0 '+
 *         'const int reads_0_l = 2; '+
 *         'const int reads_0_0 = int(0); '+
 *         'const int reads_0_1 = int(1);\n'+
 *     '#define reads_0_i(i) ((i == 1)? reads_0_1 : reads_0_0)\n';
 *
 *     ++state.passNow;
 *     state.pre = 'draw_';
 *     state.steps.push(null);
 *     Object.assign(state.maps, mapSamples(mapGroups({
 *         values: [4, 2, 3, 1], channelsMax: 4, texturesMax: 2,
 *         derives: [[1, 0], , [2, [1, 0]]]
 *     })));
 *
 *     macroPass(state); // =>
 *     '#define draw_texture_0 0\n'+
 *     '#define draw_channels_0 rgba\n'+
 *     '\n'+
 *     '#define draw_texture_1 1\n'+
 *     '#define draw_channels_1 rg\n'+
 *     '\n'+
 *     '#define draw_texture_2 2\n'+
 *     '#define draw_channels_2 rgb\n'+
 *     '\n'+
 *     '#define draw_texture_3 2\n'+
 *     '#define draw_channels_3 a\n'+
 *     '\n'+
 *     '#define draw_textures 3\n'+
 *     '#define draw_passes 2\n'+
 *     '#define draw_steps 3\n'+
 *     '\n'+
 *     '#define draw_passNow 1\n'+
 *     '\n'+
 *     '#define draw_bound_2 2\n'+
 *     '#define draw_attach_2 0\n'+
 *     '#define draw_output_2 gl_FragData[draw_attach_2].rgb\n'+
 *     '\n'+
 *     '#define draw_bound_3 2\n'+
 *     '#define draw_attach_3 0\n'+
 *     '#define draw_output_3 gl_FragData[draw_attach_3].a\n'+
 *     '\n'+
 *     '#define draw_useSamples '+
 *         'const ivec2 draw_samples_0 = ivec2(0, 2); '+
 *         'const ivec2 draw_samples_1 = ivec2(1, 0); '+
 *         'const int draw_samples_l = 2;\n'+
 *     '#define draw_samples_i(i) '+
 *         '((i == 1)? draw_samples_1 : draw_samples_0)\n'+
 *     '\n'+
 *     '#define draw_tapSamples(states, uv, textures) '+
 *         'const int data_l = 2; '+
 *         'vec4 data[data_l]; '+
 *         'data[0] = texture2D(states[(0*textures)+2], uv); '+
 *         'data[1] = texture2D(states[(1*textures)+0], uv);\n'+
 *         '#define data_i(i) data[i]\n'+
 *     '\n'+
 *     '#define draw_useReads_2 '+
 *         'const int draw_reads_2_l = 2; '+
 *         'const int draw_reads_2_0 = int(0); '+
 *         'const int draw_reads_2_1 = int(1);\n'+
 *     '#define draw_reads_2_i(i) '+
 *         '((i == 1)? draw_reads_2_1 : draw_reads_2_0)\n';
 *
 * @export
 * @param {object} state Properties for generating the macros. See `getState`
 *     and `mapGroups`.
 * @param {string} [on] Any further macro `hooks` specifier; if given, both
 *     the hook key and this specifier are checked (e.g: `key` and `key_on`).
 *
 * @returns {string} The GLSL preprocessor macros defining the mappings for
 *     values, textures, channels, bound outputs of the active pass, etc. See
 *     `macroValues`, `macroOutput`, and `macroSamples`.
 */
export const macroPass = (state, on) =>
    (hasMacros(state, hooks.macroPass, on) ??
        macroValues(state)+'\n'+macroOutput(state)+'\n'+macroSamples(state));

export default macroPass;
