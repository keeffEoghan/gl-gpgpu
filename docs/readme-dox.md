# @epok.tech/gl-gpgpu *0.6.5*

> GPGPU state-stepping - maps optimal draw passes, shaders, GL resources, inputs, outputs; lets you focus on your logic - BYORenderer.


### index.js


#### gpgpu(api[, state&#x3D;{}, to&#x3D;state]) 

Sets up all the maps, inputs, resources, etc for a GPGPU process.
Each component may also be used individually, see their documentation.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| api | `object`  | An API for GL resources. See `getState` and `getStep`. | &nbsp; |
| api.limits&#x3D;api | `object`  | A map of GL resource limits. | *Optional* |
| api.limits.maxDrawbuffers | `number`  | The maximum number of GL textures     a framebuffer can bind in a single draw call. | *Optional* |
| state&#x3D;{} | `object`  | State properties to set up; a new object by     default. See `getState`, `getUniforms`, and `getStep`. | *Optional* |
| state.maps | `object`  | How values are grouped per-texture per-pass     per-step. Sets up new maps if not given or missing its mapped properties.<br>    See `mapGroups`. | *Optional* |
| state.maps.buffersMax&#x3D;api.limits.maxDrawbuffers | `number`  | The     maximum number of textures to use per draw pass. Uses more passes above<br>    this limit. | *Optional* |
| to&#x3D;state | `object`  | The state object to set up. Modifies the given     `state` object by default. | *Optional* |




##### Returns


- `object`  The given `to` object, with its properties set up.




### inputs.js


#### getUniforms(state) 

Uniform inputs for GPGPU calls, such as in `getStep`.
Uniforms are defined as callback hooks called at each pass, using properties
from given global context and local state objects, allowing different APIs or
author-defined hooks.
Handles inputs of states as arrays of textures, or merged in one texture;
for arrays of textures, textures are arranged here on each step so GLSL can
dynamically access the flattened array of textures at by constant step index;
otherwise the single merged texture is bound once, and GLSL can use dynamic
current step to access states by texture sampling.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| state | `object`  | The GPGPU state to use. See `getState` and `mapGroups`. | &nbsp; |
| state.pre&#x3D;preDef | `string`  | Namespace prefix; `preDef` if not given. | *Optional* |
| state.size | `object`  | Size information of the `state`. See `getState`. | *Optional* |
| state.size.shape | `array.<number>`  | The data's shape. See `getState`. | *Optional* |
| state.steps | `array` `number`  | The array of steps, or number of steps.     See `getState`. | &nbsp; |
| state.merge | `object`  | Any merged state texture; uses separate state     textures if not given. See `getState`. | *Optional* |
| state.maps | `object`  | How values are grouped per-texture per-pass     per-step. See `mapGroups`. | &nbsp; |
| state.maps.textures | `array.<array.<number>>`  | How values are grouped into     textures. See `mapGroups`. | &nbsp; |
| state.bound&#x3D;boundDef | `number`  | Number of steps bound to output,     cannot be input; for platforms forbidding read/write of same buffer. | *Optional* |
| to&#x3D;(state.uniforms | `object`  | ?? {})] The object to contain the     uniforms; `state.uniforms` or a new object if not given. | *Optional* |




##### Examples

```javascript
    const state =
        { pre: '', steps: 2, maps: mapFlow({ values: [1, 2, 3] }) };

    getUniforms(getState({}, state)); // =>
    {
        stepNow: (context, state) => {},
        dataShape: (context, state) => {},
        viewShape: (context, state) => {},
        // Data textures kept separate in a `sampler2D[]`.
        // Data textures for the 1st step ago not bound as an output.
        'states[0]': (context, state) => {},
        'states[1]': (context, state) => {}
    };

    getUniforms(getState({}, { ...state, steps: 3 })); // =>
    {
        stepNow: (context, state) => {},
        dataShape: (context, state) => {},
        viewShape: (context, state) => {},
        // Data textures kept separate in a `sampler2D[]`.
        // Data textures for the 1st step ago not bound as an output.
        'states[0]': (context, state) => {},
        'states[1]': (context, state) => {}
        // Data textures for the 2nd step ago not bound as an output.
        'states[2]': (context, state) => {},
        'states[3]': (context, state) => {}
    };

    getUniforms(getState({}, { ...state, merge: true })); // =>
    {
        stepNow: (context, state) => {},
        dataShape: (context, state) => {},
        viewShape: (context, state) => {},
        // All states merged into one data texture upon every pass; for
        // `sampler2D`, or `sampler3D` or `sampler2DArray` where supported.
        states: (context, state) => {}
    };
```


##### Returns


- `object.&lt;number, array.&lt;number&gt;, *, getUniform&gt;`  `to` The uniform hooks     for the given `state`. Each is a static number or array of numbers; or a
    GL object such as a texture; or a `getUniform` function returning one, to
    be called on each pass.



#### addTextures() 

Past steps, each some steps `ago`, from the current active step at `0`
`[0,... stepsL-1-bound]`.






##### Returns


- `Void`




### macros.js


#### hasMacros([props, key, on&#x3D;&#x27;&#x27;]) 

Whether macros should be handled here; or the result of handling them by a
given named hook.
Allows macros of the given key to be handled by external named hooks, to
replace any part of the functionality here.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| props | `object`  | The properties handling macros. | *Optional* |
| key | `string`  | The name for which macros should be handled. | *Optional* |
| on&#x3D;&#x27;&#x27; | `string`  | Any further macro `hooks` specifier; if given, both     the hook key and this specifier are checked (e.g: `key` and `key_on`). | *Optional* |
| macros&#x3D;props.macros | `string` `function` `object` `false`  | Whether and how     GLSL preprocessor macros should be handled:<br>    - If it's false-y and non-nullish, no macros are handled here.<br>    - If it's a string, no macros are handled here as it's used instead.<br>    - If it's a function, it's passed the given `props`, `key`, `macros`, and<br>        the returned result is used.<br>    - If it's an object, any value at the given `key` is entered recursively,<br>        with the given `props`, `key`, and `macros[key]`.<br>    - Otherwise, returns `null` to indicate macros should be handled here. | *Optional* |




##### Examples

```javascript
    // Macros to be handled here, the default.
    [hasMacros(), hasMacros({}), hasMacros({ macros: true })]]
        .every((m) => m === null);

    // Macros to be handled here, with prefix `'pre_'` instead of `'preDef'`.
    hasMacros({ pre: 'pre_' }) === null;

    // Macros not created.
    [hasMacros({ macros: false }), hasMacros({ macros: 0 })]
        .every((m) => m === '');

    // Macros for 'a' handled by external static hook, not here.
    hasMacros({ macros: { a: '//A\n', b: () => '//B\n' } }, 'a') === '//A\n';
    // Macros for 'b' handled by external function hook, not here.
    hasMacros({ macros: { a: '//A\n', b: () => '//B\n' } }, 'b') === '//B\n';
    // Macros specified `on` a 'frag' not created.
    hasMacros({ macros: { frag: 0 } }, '', 'frag') === '';
    // Macros specified `on` a 'vert' handled here.
    hasMacros({ macros: { frag: 0, a_vert: 0 } }, '', 'vert') === null;
    // Macros for hook `'a'` specified `on` a 'vert' not created.
    hasMacros({ macros: { frag: 0, a_vert: 0 } }, 'a', 'vert') === '';
```


##### Returns


- `string`  Either the result of the macros handled elsewhere,     or `null` if macros should be handled here.



#### macroValues(state[, on]) 

Defines the values within textures per-step, as GLSL preprocessor macros.
These macros define mappings from values to their textures and channels.
Caches the result if `macros` generation is enabled, to help reuse shaders.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| state | `object`  | Properties used to generate the macros. See `getState`. | &nbsp; |
| on | `string`  | Any further macro `hooks` specifier; if given, both     the hook key and this specifier are checked (e.g: `key` and `key_on`). | *Optional* |
| state.macros | `string` `function` `object` `false`  | How macros are handled     or prefixed. See `hasMacros`. | *Optional* |
| state.pre&#x3D;preDef | `string`  | Macros prefix; `preDef` if not given. | *Optional* |
| state.maps | `object`  | How values are grouped per-texture per-pass     per-step. | &nbsp; |
| state.maps.values | `array.<number>`  | How values of each data item are     grouped into textures. See `mapGroups`. | &nbsp; |
| state.maps.textures | `array.<array.<number>>`  | The groupings of values     into textures. See `mapGroups`. | &nbsp; |
| state.maps.passes | `array`  | Passes drawn per-step. See `mapGroups`. | &nbsp; |
| state.steps | `array` `number`  | States drawn across frames. See `getState`. | &nbsp; |
| state.bound&#x3D;boundDef | `number`  | How many steps are bound as outputs,     unavailable as inputs. | *Optional* |
| state.size | `object`  | Any size information about the GL resources. | *Optional* |
| state.size.count | `number`  | The number of data entries per texture     (the texture's area), if given. See `getState`. | *Optional* |




##### Examples

```javascript
    const maps = { values: [2, 4, 1], channelsMax: 4 };

    // No optimisations - values not packed, single texture output per pass.
    const state = {
         pre: '', steps: 2,
         maps: mapGroups({ ...maps, buffersMax: 1, packed: 0 })
    };

    macroValues(state); // =>
    '#define texture_0 0\n'+
    '#define channels_0 rg\n'+
    '\n'+
    '#define texture_1 1\n'+
    '#define channels_1 rgba\n'+
    '\n'+
    '#define texture_2 2\n'+
    '#define channels_2 r\n'+
    '\n'+
    '#define textures 3\n'+
    '#define passes 3\n'+
    '#define stepsPast 1\n'+
    '#define steps 2\n'+
    '\n';

    // Automatically packed values - values across fewer textures/passes.
    state.maps = mapGroups({ ...maps, buffersMax: 1 });
    state.size = { count: 2**5 };
    macroValues(state); // =>
    '#define texture_1 0\n'+
    '#define channels_1 rgba\n'+
    '\n'+
    '#define texture_0 1\n'+
    '#define channels_0 rg\n'+
    '\n'+
    '#define texture_2 1\n'+
    '#define channels_2 b\n'+
    '\n'+
    '#define count 32\n'+
    '#define textures 2\n'+
    '#define passes 2\n'+
    '#define stepsPast 1\n'+
    '#define steps 2\n'+
    '\n';

    // Can bind more texture outputs per pass - values across fewer passes.
    state.maps = mapGroups({ ...maps, buffersMax: 4 });
    macroValues(state); // =>
    '#define texture_1 0\n'+
    '#define channels_1 rgba\n'+
    '\n'+
    '#define texture_0 1\n'+
    '#define channels_0 rg\n'+
    '\n'+
    '#define texture_2 1\n'+
    '#define channels_2 b\n'+
    '\n'+
    '#define count 32\n'+
    '#define textures 2\n'+
    '#define passes 1\n'+
    '#define stepsPast 1\n'+
    '#define steps 2\n'+
    '\n';
```


##### Returns


- `string`  The GLSL preprocessor macros defining the mappings from     values to textures/channels.



#### macroOutput(state[, on]) 

Defines the outputs being drawn to per-pass, as GLSL preprocessor macros.
These macros define mappings from values to their outputs, if bound.
Caches the result if `macros` generation is enabled, to help reuse shaders.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| state | `object`  | Properties for generating the macros. See `getState`: | &nbsp; |
| on | `string`  | Any further macro `hooks` specifier; if given, both     the hook key and this specifier are checked (e.g: `key` and `key_on`). | *Optional* |
| state.macros | `string` `function` `object` `false`  | How macros are handled.     See `hasMacros`. | *Optional* |
| state.pre&#x3D;preDef | `string`  | Macros prefix; `pre` if not given. | *Optional* |
| state.passNow | `number`  | The index of the currently active pass. | &nbsp; |
| state.maps | `object`  | How values are grouped per-texture per-pass     per-step. See `mapGroups`. | &nbsp; |
| state.maps.values | `array.<number>`  | How values of each data item may be     grouped into textures across passes. See `mapGroups`. | &nbsp; |
| state.maps.textures | `array.<array.<number>>`  | The groupings of values     into textures. See `mapGroups`. | &nbsp; |
| state.maps.passes | `array.<array.<number>>`  | The groupings of textures     into passes. See `mapGroups`. | &nbsp; |




##### Examples

```javascript
    const maps = { values: [2, 4, 1], channelsMax: 4 };

    // No optimisations - values not packed, single texture output per pass.
    const state = {
         pre: '', passNow: 0,
         maps: mapGroups({ ...maps, buffersMax: 1, packed: 0 })
    };

    macroOutput(state); // =>
    '#define passNow 0\n'+
    '\n'+
    '#define bound_0 0\n'+
    '#define attach_0 0\n'+
    '#define output_0 gl_FragData[attach_0].rg\n'+
    '\n';

    // Automatically packed values - values across fewer textures/passes.
    state.maps = mapGroups({ ...maps, buffersMax: 1 });
    macroOutput(state); // =>
    '#define passNow 0\n'+
    '\n'+
    '#define bound_1 0\n'+
    '#define attach_1 0\n'+
    '#define output_1 gl_FragData[attach_1].rgba\n'+
    '\n';

    // Next pass in this step.
    ++state.passNow;
    macroOutput(state); // =>
    '#define passNow 1\n'+
    '\n'+
    '#define bound_0 1\n'+
    '#define attach_0 0\n'+
    '#define output_0 gl_FragData[attach_0].rg\n'+
    '\n'+
    '#define bound_2 1\n'+
    '#define attach_2 0\n'+
    '#define output_2 gl_FragData[attach_2].b\n'+
    '\n';

    // Can bind more texture outputs per pass - values across fewer passes.
    state.maps = mapGroups({ ...maps, buffersMax: 4 });
    state.passNow = 0;
    macroOutput(state); // =>
    '#define passNow 0\n'+
    '\n'+
    '#define bound_1 0\n'+
    '#define attach_1 0\n'+
    '#define output_1 gl_FragData[attach_1].rgba\n'+
    '\n'+
    '#define bound_0 1\n'+
    '#define attach_0 1\n'+
    '#define output_0 gl_FragData[attach_0].rg\n'+
    '\n'+
    '#define bound_2 1\n'+
    '#define attach_2 1\n'+
    '#define output_2 gl_FragData[attach_2].b\n'+
    '\n';
```


##### Returns


- `string`  The GLSL preprocessor macros for the pass's bound outputs.



#### macroSamples(state[, on]) 

Defines the texture samples/reads per-pass, as GLSL preprocessor macros.
The macros define the mapping between the values and those they derive from,
as step/texture locations in a `samples` list, and indexes to read values
from sampled data in a `reads` list (once sampled into a `data` list, as in
`macroTaps` or similar).
They're set up as function-like macros that may be called from the shader to
initialise the mappings arrays with a given name.
Caches the result if `macros` generation is enabled, to help reuse shaders.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| state | `object`  | Properties used to generate the macros. See `getState`. | &nbsp; |
| on | `string`  | Any further macro `hooks` specifier; if given, both     the hook key and this specifier are checked (e.g: `key` and `key_on`). | *Optional* |
| state.macros | `string` `function` `object` `false`  | How macros are handled.     See `hasMacros`. | *Optional* |
| state.pre&#x3D;preDef | `string`  | Macros prefix; `preDef` if not given. | *Optional* |
| state.passNow&#x3D;0 | `number`  | The index of the currently active pass;     uses the first pass if not given. | *Optional* |
| state.maps | `object`  | How `values` are grouped per-texture per-pass     per-step. See `mapGroups`. | &nbsp; |
| state.maps.samples | `array.<array.<array.<number>>>`  | The minimal set of     texture samples to use. See `mapSamples`. | *Optional* |
| state.maps.reads | `array.<array.<array.<number>>>`  | The mappings from     values to the corresponding `state.samples`. See `mapSamples`. | *Optional* |
| state.glsl&#x3D;1 | `number`  | The GLSL language version. See `getGLSLList`. | *Optional* |




##### Examples

```javascript
    const values = [2, 4, 1];
    const derives = [2, , [[1, 0], true]];
    const maps = { values, derives, channelsMax: 4 };

    // No optimisations - values not packed, single texture output per pass.
    const state =
        { pre: '', maps: mapFlow({ ...maps, buffersMax: 1, packed: 0 }) };

    // USes the first pass by default.
    macroSamples(state); // =>
    '#define useSamples'+cr+
        'const int samples_l = 1;'+cr+
        'const ivec2 samples_0 = ivec2(0, 2);\n'+
    '// Index macro `samples_i` (e.g: `samples_i(0)`) may be slow, '+
        'use name (e.g: `samples_0`) if possible.\n'+
    '#define samples_i(i) samples_0\n'+
    '\n'+
    '#define useReads_0'+cr+
        'const int reads_0_l = 1;'+cr+
        'const int reads_0_0 = int(0);\n'+
    '// Index macro `reads_0_i` (e.g: `reads_0_i(0)`) may be slow, '+
        'use name (e.g: `reads_0_0`) if possible.\n'+
    '#define reads_0_i(i) reads_0_0\n'+
    '\n';

    // Next pass in this step - no derives, no samples nor reads.
    state.passNow = 1;
    macroSamples(state); // =>
    '';

    // Next pass in this step.
    ++state.passNow;
    macroSamples(state); // =>
    '#define useSamples'+cr+
        'const int samples_l = 4;'+cr+
        'const ivec2 samples_0 = ivec2(1, 0);'+cr+
        'const ivec2 samples_1 = ivec2(0, 0);'+cr+
        'const ivec2 samples_2 = ivec2(0, 1);'+cr+
        'const ivec2 samples_3 = ivec2(0, 2);\n'+
    '// Index macro `samples_i` (e.g: `samples_i(0)`) may be slow, '+
        'use name (e.g: `samples_0`) if possible.\n'+
    '#define samples_i(i) ((i == 3)? samples_3 : ((i == 2)? samples_2 '+
        ': ((i == 1)? samples_1 : samples_0)))\n'+
    '\n'+
    '#define useReads_2'+cr+
        'const int reads_2_l = 4;'+cr+
        'const int reads_2_0 = int(0);'+cr+
        'const int reads_2_1 = int(1);'+cr+
        'const int reads_2_2 = int(2);'+cr+
        'const int reads_2_3 = int(3);\n'+
    '// Index macro `reads_2_i` (e.g: `reads_2_i(0)`) may be slow, '+
        'use name (e.g: `reads_2_0`) if possible.\n'+
    '#define reads_2_i(i) ((i == 3)? reads_2_3 : ((i == 2)? reads_2_2 '+
        ': ((i == 1)? reads_2_1 : reads_2_0)))\n'+
    '\n';

    // Automatically packed values - values across fewer textures/passes.
    // Can bind more texture outputs per pass - values across fewer passes.
    // Also fewer samples where values share derives or textures.
    state.maps = mapGroups({ ...maps, buffersMax: 4 });
    state.passNow = 0;
    macroSamples(state); // =>
    '#define useSamples'+cr+
        'const int samples_l = 3;'+cr+
        'const ivec2 samples_0 = ivec2(0, 1);'+cr+
        'const ivec2 samples_1 = ivec2(1, 1);'+cr+
        'const ivec2 samples_2 = ivec2(0, 0);\n'+
    '// Index macro `samples_i` (e.g: `samples_i(0)`) may be slow, '+
        'use name (e.g: `samples_0`) if possible.\n'+
    '#define samples_i(i) '+
        '((i == 2)? samples_2 : ((i == 1)? samples_1 : samples_0))\n'+
    '\n'+
    '#define useReads_0'+cr+
        'const int reads_0_l = 1;'+cr+
        'const int reads_0_0 = int(0);\n'+
    '// Index macro `reads_0_i` (e.g: `reads_0_i(0)`) may be slow, '+
        'use name (e.g: `reads_0_0`) if possible.\n'+
    '#define reads_0_i(i) reads_0_0\n'+
    '\n'+
    '#define useReads_2'+cr+
        'const int reads_2_l = 4;'+cr+
        'const int reads_2_0 = int(1);'+cr+
        'const int reads_2_1 = int(0);'+cr+
        'const int reads_2_2 = int(2);'+cr+
        'const int reads_2_3 = int(0);\n'+
    '// Index macro `reads_2_i` (e.g: `reads_2_i(0)`) may be slow, '+
        'use name (e.g: `reads_2_0`) if possible.\n'+
    '#define reads_2_i(i) ((i == 3)? reads_2_3 : ((i == 2)? reads_2_2 '+
        ': ((i == 1)? reads_2_1 : reads_2_0)))\n'+
    '\n';
```


##### Returns


- `string`  The GLSL preprocessor macros defining the mappings for     samples and reads, for each value.



#### macroTaps(state[, on]) 

Defines the samples of textures per-pass, as GLSL preprocessor macros.
The macros define the minimal sampling of textures for the data the active
pass's values derive from; creates a `data` list containing the samples; the
`samples` list names are required, as created by `macroSamples` or similar.
Handles sampling states in a flat array of textures, or merged in one texture
(in both `sampler2D`, and `sampler3D`/`sampler2DArray` where supported).
Merging allows shaders to access past steps by non-constant lookups; e.g:
attributes cause "sampler array index must be a literal expression" on GLSL3
spec and some platforms (e.g: D3D); note these need texture repeat wrapping.
They're set up as function-like macros that may be called from the shader to
initialise the mappings arrays with a given name.
Caches the result if `macros` generation is enabled, to help reuse shaders.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| state | `object`  | Properties used to generate the macros. See `getState`. | &nbsp; |
| on | `string`  | Any further macro `hooks` specifier; if given, both     the hook key and this specifier are checked (e.g: `key` and `key_on`). | *Optional* |
| state.macros | `string` `function` `object` `false`  | How macros are handled.     See `hasMacros`. | *Optional* |
| state.pre&#x3D;preDef | `string`  | Macros prefix; `preDef` if not given. | *Optional* |
| state.passNow&#x3D;0 | `number`  | The index of the currently active pass;     uses the first pass if not given. | *Optional* |
| state.maps | `object`  | How `values` are grouped per-texture per-pass     per-step. See `mapGroups`. | &nbsp; |
| state.maps.samples | `array.<array.<array.<number>>>`  | The minimal set of     texture samples to use. See `mapSamples`. | *Optional* |
| state.merge | `object`  | Any merged state texture; uses separate state     textures if not given. See `getState`. | *Optional* |
| state.glsl&#x3D;1 | `number`  | The GLSL language version. See `getGLSLList`. | *Optional* |




##### Examples

```javascript
    const values = [2, 4, 1];
    const derives = [2, , [[1, 0], true]];
    const maps = { values, derives, channelsMax: 4 };

    // No optimisations - values not packed, single texture output per pass.
    const state =
        { pre: '', maps: mapFlow({ ...maps, buffersMax: 1, packed: 0 }) };

    // Uses the first pass by default.
    macroTaps(state); // =>
    '@todo';

    // Next pass in this step - no derives, no samples nor reads.
    state.passNow = 1;
    macroTaps(state); // =>
    '';

    // Next pass in this step.
    ++state.passNow;
    macroTaps(state); // =>
    '@todo';

    // Automatically packed values - values across fewer textures/passes.
    // Can bind more texture outputs per pass - values across fewer passes.
    // Also fewer samples where values share derives or textures.
    state.maps = mapGroups({ ...maps, buffersMax: 4 });
    state.passNow = 0;
    macroTaps(state); // =>
    '@todo';
```


##### Returns


- `string`  The GLSL preprocessor macros defining the minimal sampling     of textures, to suit how states are stored (flat array of textures, or
    all merged into one texture) and supported GLSL language features.




### maps.js


#### packValues(values[, channelsMax&#x3D;channelsMaxDef, to&#x3D;]) 

Minimise resource usage, order `values` to pack into blocks of `channelsMax`;
interpreted as indexes into the given `values`.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| values | `array.<number>`  | Each entry is how many interdependent channels     are grouped into one texture in one pass, separate entries may be across<br>    one or more textures/passes. See `mapGroups`. | &nbsp; |
| channelsMax&#x3D;channelsMaxDef | `number`  | The maximum number of channels     per texture. See `mapGroups`. | *Optional* |
| to&#x3D; | `array`  | An array to store the result; a new array by default. | *Optional* |




##### Examples

```javascript
    packValues([1, 2, 3], 4, []); // =>
    [2, 0, 1];

    packValues([3, 2, 1], 4, []); // =>
    [0, 2, 1];

    packValues([4, 3, 2], 4, []); // =>
    [0, 1, 2];

    packValues([1, 1, 4, 2], 4, []); // =>
    [2, 3, 0, 1];
```


##### Returns


- `array.&lt;number&gt;`  `to` The indexes of the given `values`, reordered     to pack into the fewest buckets of `channelsMax` size or less; stored in
    the given `to` array.



#### mapGroups([maps&#x3D;{}, to&#x3D;maps]) 

Groups the `values` of GPGPU data items across draw passes and data textures.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| maps&#x3D;{} | `object`  | Maps and initial settings; new object if not given. | *Optional* |
| maps.values&#x3D;valuesDef() | `array.<number>`  | An array where each number     denotes how many value channels are grouped into one data texture in one<br>    draw pass (where any value map logic isn't handled here); each separate<br>    number may be computed across one or more data textures/passes.<br>    Each value denotes the number of dependent channels to compute together;<br>    separate values denote channels that are independent, and may be drawn in<br>    the same or separate passes, depending on settings/support.<br>    The order may affect the number of passes/textures needed; can maintain<br>    order as-is, or use a more efficient `packed` order. See `packValues`. | *Optional* |
| maps.channelsMax&#x3D;channelsMaxDef | `number`  | Maximum channels per     texture. | *Optional* |
| maps.buffersMax&#x3D;buffersMaxDef | `number`  | Maximum textures bound per     pass. | *Optional* |
| maps.packed | `array.<number>` `false`  | An array of indexes into `values`     packed into an order that best fits into blocks of `channelsMax` to<br>    minimise resources; or false-y to use `values` in their given order;<br>    uses `packValues` if not given. | *Optional* |
| to&#x3D;maps | `object`  | An object to contain the results; modifies `maps`     if not given. | *Optional* |




##### Examples

```javascript
    const x = 2;
    const y = 4;
    const z = 1;
    const maps = { values: [x, y, z], channelsMax: 4 };

    // No optimisations - values not packed, single texture output per pass.
    mapGroups({ ...maps, buffersMax: 1, packed: false }); // =>
    {
        ...maps, packed: false,
        textures: [[0], [1], [2]], // length === 3
        passes: [[0], [1], [2]], // length === 3
        valueToTexture: [0, 1, 2], valueToPass: [0, 1, 2],
        textureToPass: [0, 1, 2]
    };

    // Automatically packed values - values across fewer textures/passes.
    mapGroups({ ...maps, buffersMax: 1 }); // =>
    {
        ...maps, packed: [1, 0, 2],
        textures: [[1], [0, 2]], // length === 2
        passes: [[0], [1]], // length === 2
        valueToTexture: [1, 0, 1], valueToPass: [1, 0, 1],
        textureToPass: [0, 1]
    };

    // Can bind more texture outputs per pass - values across fewer passes.
    mapGroups({ ...maps, buffersMax: 4 }); // =>
    {
        ...maps, packed: [1, 0, 2],
        textures: [[1], [0, 2]], // length === 2
        passes: [[0, 1]], // length === 1
        valueToTexture: [1, 0, 1], valueToPass: [0, 0, 0],
        textureToPass: [0, 0]
    };

    // Custom packed values - fuller control.
    mapGroups({ ...maps, buffersMax: 4, packed: [0, 2, 1] }); // =>
    {
        ...maps, packed: [0, 2, 1],
        textures: [[0, 2], [1]], // length === 2
        passes: [[0, 1]], // length === 1
        valueToTexture: [0, 1, 0], valueToPass: [0, 0, 0],
        textureToPass: [0, 0]
    };

    // Merge dependent values - fuller control, but no map for merged values.
    mapGroups({ ...maps, values: [x+z, y], buffersMax: 4 }); // =>
    {
        ...maps, packed: [1, 0],
        textures: [[1], [0]], // length === 2
        passes: [[0, 1]], // length === 1
        valueToTexture: [1, 0], valueToPass: [0, 0],
        textureToPass: [0, 0]
    };
```


##### Returns


- `object`  `to` The given `to` object; how `values` are grouped     per-texture per-pass per-step, meta information, and given parameters.
- `array.&lt;array.&lt;number&gt;&gt;`  `to.passes` Textures grouped into passes, as     arrays corresponding to framebuffers in separate draw passes; whose
    values are indexes into `to.textures`.
- `array.&lt;array.&lt;number&gt;&gt;`  `to.textures` Values grouped into     textures, as arrays corresponding to framebuffer attachments, into which
    `values` are drawn; whose values are indexes into `to.values`.
- `array.&lt;number&gt;`  `to.values` The `values`, as given.
- `number`  `to.buffersMax` The max textures per pass, as given.
- `number`  `to.channelsMax` The max channels per texture, as given.
- `array.&lt;number&gt;`  `to.valueToTexture` Inverse map from each index of     `to.values` to the index of the data texture containing it.
- `array.&lt;number&gt;`  `to.valueToPass` Inverse map from each index of     `to.values` to the index of the pass containing it.
- `array.&lt;number&gt;`  `to.textureToPass` Inverse map from each index of     `to.textures` to the index of the pass containing it.



#### mapSamples(maps[, to&#x3D;maps]) 

Maps the minimal set of texture reads to derive the next state of values from
a past state of values they depend upon.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| maps | `object`  | How values are grouped per-texture, per-pass, per-step.     See `mapGroups`. | &nbsp; |
| maps.derives | `true` `array`  | How `values` map to any past `values` they     derive from. If given falsey, creates no maps to derive values; . | *Optional* |
| maps.derives. | `true` `number` `array`  | L1 | *Optional* |
| maps.derives.. | `true` `number` `array`  | L2 | *Optional* |
| maps.derives... | `true` `number`  | L3 | *Optional* |
| maps.derives | `true` `array.<true, number, array.<true, number, array.<true, number>>>`  |     How values derive from past values.<br>    If given as a sparse array, each entry relates the corresponding value to<br>    any past value steps/indexes it derives from - a value not derived from<br>    past values may have an empty/null entry; a value derives from past<br>    values where its entry has:<br>    - Numbers; deriving from the most recent state at the given value index.<br>    - Lists of numbers; deriving from the given past state index (1st number<br>        denotes how many steps ago), at the given value index (2nd number).<br>    The nested hierarchy thus has any `pass,[values,[value,[step, value]]]`.<br>    If any level is given as `true`, maps to sample all values, at the given<br>    step (or most recent step, if none given).<br>    If no `derives` given, no samples are mapped, `to` is returned unchanged. | *Optional* |
| maps.passes | `array.<array.<number>>`  | Textures grouped into passes. See     `mapGroups`. | &nbsp; |
| maps.textures | `array.<array.<number>>`  | Values grouped into textures. See     `mapGroups`. | &nbsp; |
| maps.valueToTexture | `array.<number>`  | Inverse map from each value index     to the data texture index containing it. | &nbsp; |
| to&#x3D;maps | `object`  | The object to store the result in; `maps` if not     given. | *Optional* |




##### Examples

```javascript
    const maps = mapGroups({
        // See `mapGroups` examples for resulting maps.
        values: [2, 4, 1], channelsMax: 4, buffersMax: 1, packed: false,
        // Derived step/value indexes, per-value; sample entries include:
        derives: [
            // Single...
            2,
            // Empty...
            ,
            // Multiple...
            [
                // Defined step...
                [1, 0],
                // All values at any given level/step...
                true
            ]
        ]
    });

    mapSamples(maps); // =>
    {
        ...maps,
        // Minimum texture samples for values; nested per-pass, per-value.
        // Deepest arrays are step/texture index pairs into `maps.textures`.
        samples: [
            [[0, 2]],
            null,
            [[1, 0], [0, 0], [0, 1], [0, 2]]
        ],
        // Value indexes into `to.samples`; nested per-pass, per-value.
        // Map from a value index to data it needs in the minimal samples.
        reads: [
            [[0]],
            null,
            [null, null, [0, 1, 2, 3]]
        ]
    };
```


##### Returns


- `object`  `to` The given `to` object, with resulting maps added for     any given `maps.derives`.
- `array.&lt;array.&lt;array.&lt;number&gt;&gt;&gt;`  `[to.samples]` Map of the minimum     set of indexes into `maps.textures` that need to be sampled per-pass,
    to get all `derives` needed for each value of `maps.values` of each
    pass of `maps.passes`.
- `array.&lt;array.&lt;array.&lt;number&gt;&gt;&gt;`  `[to.reads]` Sparse map from     each value of `derives` to its step and texture indexes in `to.samples`.
- `true` `array.&lt;true, number, array.&lt;true, number, array.&lt;true, number&gt;&gt;&gt;`      `[to.derives]` How values derive from past values, as given.




### state.js


#### getState(api[, state&#x3D;{}, to&#x3D;state]) 

Set up the GPGPU resources and meta information for a state of a number data.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| api | `object`  | The API for GL resources. | &nbsp; |
| api.texture | `texture`  | Function to create a GL texture. | *Optional* |
| api.framebuffer | `framebuffer`  | Function to create a GL framebuffer. | *Optional* |
| state&#x3D;{} | `object`  | The state parameters. | *Optional* |
| state.width&#x3D;widthDef | `number`  | Data width, aliases follow in order     of precedence. See `getWidth`. | *Optional* |
| state.w | `number`  | Alias of `state.width`. See `getWidth`. | *Optional* |
| state.x | `number`  | Alias of `state.width`. See `getWidth`. | *Optional* |
| state.height&#x3D;heightDef | `number`  | Data height, aliases follow in order     of precedence. See `getHeight`. | *Optional* |
| state.h | `number`  | Alias of `state.height`. See `getHeight`. | *Optional* |
| state.y | `number`  | Alias of `state.height`. See `getHeight`. | *Optional* |
| state.shape | `number`  | Data size. See `getWidth` and `getHeight`. | *Optional* |
| state.size | `number`  | Data size. See `getWidth` and `getHeight`. | *Optional* |
| state.side | `number`  | Data size of width/height.     See `getWidth` and `getHeight`. | *Optional* |
| state.0 | `number`  | Alias of `state.width` (index 0). See `getWidth`. | *Optional* |
| state.1 | `number`  | Alias of `state.height` (index 1). See `getHeight`. | *Optional* |
| state.scale&#x3D;scaleDef | `number`  | Data size of width/height as a square     power-of-two size, 2 raised to this power. See `getScaled`. | *Optional* |
| state.steps&#x3D;stepsDef | `number` `array`  | How many steps of state to     track, or the list of states if already set up. | *Optional* |
| state.maps | `object`  | How `state.maps.values` are grouped per-texture     per-pass per-step. See `mapGroups`. | *Optional* |
| state.maps.values&#x3D;valuesDef() | `array.<number>`  | How values of each     data item may be grouped into textures across passes; set up here if not<br>    given. See `mapGroups`. | *Optional* |
| state.maps.channelsMin&#x3D;channelsMinDef | `number`  | The minimum allowed     channels for framebuffer attachments; allocates unused channels as needed<br>    to reach this limit. | *Optional* |
| state.maps.textures | `number`  | How values are grouped into textures.     See `mapGroups`. | *Optional* |
| state.stepNow | `number`  | The currently active state step, if any. | *Optional* |
| state.passNow | `number`  | The currently active draw pass, if any. | *Optional* |
| state.type&#x3D;typeDef | `string`  | Texture data type. | *Optional* |
| state.min&#x3D;minDef | `string`  | Texture minification filter. | *Optional* |
| state.mag&#x3D;magDef | `string`  | Texture magnification filter. | *Optional* |
| state.wrap&#x3D;wrapDef | `string`  | Texture wrap mode. | *Optional* |
| state.depth&#x3D;depthDef | `boolean`  | Framebuffer depth attachment. | *Optional* |
| state.stencil&#x3D;stencilDef | `boolean`  | Framebuffer stencil attachment. | *Optional* |
| state.merge&#x3D;mergeDef | `boolean`  | Whether to merge states into one     texture; `true` handles merging here; any other truthy is used as-is (the<br>    merged texture already set up); falsey uses un-merged arrays of textures.<br>    Merging allows shaders to access past steps by non-constant lookups; e.g:<br>    attributes cause "sampler array index must be a literal expression" on<br>    GLSL3 spec and some platforms (e.g: D3D); but takes more work to copy the<br>    last pass's bound texture/s to merge into the past texture, so should be<br>    used to variably access past steps or avoid arrays of textures limits.<br>    Only this merged past texture and those bound in an active pass are<br>    created, as upon each pass the output will be copied to the past texture,<br>    and bound textures reused in the next pass.<br>    If not merging, all state is as output by its pass in its own one of the<br>    arrays of textures.<br>    The default merged texture is laid out as `[texture, step]` on the<br>    `[x, y]` axes, respectively; if other layouts are needed, the merge<br>    texture can be given here to be used as-is, and the merging/copying and<br>    lookup logic in their respective hooks. See `getStep` and `macroTaps`.<br>    If a merge texture is given, size information is interpreted in a similar<br>    way and precedence as it is from `state`. See `getWidth` and `getHeight`. | *Optional* |
| state.merge.width | `number`  | Merged data width, aliases follow in     order of precedence. See `state`. | *Optional* |
| state.merge.w | `number`  | Alias of `state.merge.width`. See `state`. | *Optional* |
| state.merge.x | `number`  | Alias of `state.merge.width`. See `state`. | *Optional* |
| state.merge.height | `number`  | Merged data height, aliases follow in     order of precedence. See `state`. | *Optional* |
| state.merge.h | `number`  | Alias of `state.merge.height`. See `state`. | *Optional* |
| state.merge.y | `number`  | Alias of `state.merge.height`. See `state`. | *Optional* |
| state.merge.shape | `number`  | Merged data size. See `state`. | *Optional* |
| state.merge.size | `number`  | Merged data size. See `state`. | *Optional* |
| state.merge.side | `number`  | Merged data size of width/height.     See `state`. | *Optional* |
| state.merge.0 | `number`  | Alias of `state.merge.width` (index 0).     See `state`. | *Optional* |
| state.merge.1 | `number`  | Alias of `state.merge.height` (index 1).     See `state`. | *Optional* |
| state.merge.scale | `number`  | Merged data size of width/height as a     square power-of-two size, 2 raised to this power. See `state`. | *Optional* |
| to&#x3D;state | `object`  | The state object to set up. Modifies the given     `state` object by default. | *Optional* |




##### Examples

```javascript
    const api = {
        framebuffer: ({ depth, stencil, width, height, color }) => null,
        texture: ({ type, min, mag, wrap, width, height, channels }) => null
    };

    // Example with `webgl_draw_buffers` extension support, for 4 buffers.
    let maps = mapGroups({ values: [1, 2, 3], buffersMax: 4, packed: 0 });
    let state = { steps: 2, side: 10, maps };

    const s0 = getState(api, state, {}); // =>
    {
        ...state, passNow: undefined, stepNow: undefined,
        size: {
            steps: 2, passes: 2, textures: 4,
            width: 10, height: 10, shape: [10, 10], count: 100
        },
        steps: [
            [s0.passes[0][0].framebuffer], [s0.passes[1][0].framebuffer]
        ],
        // This setup results in fewer passes, as more buffers can be bound.
        passes: [
            [
                {
                    framebuffer: api.framebuffer(s0.passes[0][0]),
                    color: [
                        s0.textures[0][0].texture, s0.textures[0][1].texture
                    ],
                    map: [0, 1], // maps.passes[0]
                    entry: 0, index: 0, step: 0,
                    depth: false, stencil: false, width: 10, height: 10
                }
            ],
            [
                {
                    framebuffer: api.framebuffer(s0.passes[1][0]),
                    color: [
                        s0.textures[1][0].texture, s0.textures[1][1].texture
                    ],
                    map: [0, 1], // maps.passes[0]
                    entry: 1, index: 0, step: 1,
                    depth: false, stencil: false, width: 10, height: 10
                }
            ]
        ],
        textures: [
            [
                {
                    texture: api.texture(s0.textures[0][0]),
                    map: [0, 1], // maps.textures[0]
                    entry: 0, index: 0, step: 0, pass: 0,
                    type: 'float', width: 10, height: 10, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                },
                {
                    texture: api.texture(s0.textures[0][1]),
                    map: [2], // maps.textures[1]
                    entry: 1, index: 1, step: 0, pass: 0,
                    type: 'float', width: 10, height: 10, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                }
            ],
            [
                {
                    texture: api.texture(s0.textures[1][0]),
                    map: [0, 1], // maps.textures[0]
                    entry: 2, index: 0, step: 1, pass: 0,
                    type: 'float', width: 10, height: 10, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                },
                {
                    texture: api.texture(s0.textures[1][1]),
                    map: [2], // maps.textures[1]
                    entry: 3, index: 1, step: 1, pass: 0,
                    type: 'float', width: 10, height: 10, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                }
            ]
        ]
    };

    // Example with no `webgl_draw_buffers` extension support, only 1 buffer.
    maps = mapGroups({ values: [1, 2, 3], buffersMax: 1, packed: 0 });
    state = { type: 'uint8', steps: 2, scale: 5, maps, stepNow: 1 };

    const s1 = getState(api, state, {}); // =>
    {
        ...state, passNow: undefined, stepNow: 1,
        size: {
            steps: 2, passes: 4, textures: 4,
            width: 32, height: 32, shape: [32, 32], count: 1024
        },
        steps: [
            [s1.passes[0][0].framebuffer, s1.passes[0][1].framebuffer],
            [s1.passes[1][0].framebuffer, s1.passes[1][1].framebuffer]
        ],
        // This setup results in more passes, as fewer buffers can be bound.
        passes: [
            [
                {
                    framebuffer: api.framebuffer(s1.passes[0][0]),
                    color: [s1.textures[0][0].texture],
                    map: [0], // maps.passes[0]
                    entry: 0, index: 0, step: 0,
                    depth: false, stencil: false, width: 32, height: 32
                },
                {
                    framebuffer: api.framebuffer(s1.passes[0][1]),
                    color: [s1.textures[0][1].texture],
                    map: [1], // maps.passes[1]
                    entry: 1, index: 1, step: 0,
                    depth: false, stencil: false, width: 32, height: 32
                }
            ],
            [
                {
                    framebuffer: api.framebuffer(s1.passes[1][0]),
                    color: [s1.textures[1][0].texture],
                    map: [0], // maps.passes[0]
                    entry: 2, index: 0, step: 1,
                    depth: false, stencil: false, width: 32, height: 32
                },
                {
                    framebuffer: api.framebuffer(s1.passes[1][1]),
                    color: [s1.textures[1][1].texture],
                    map: [1], // maps.passes[1]
                    entry: 3, index: 1, step: 1,
                    depth: false, stencil: false, width: 32, height: 32
                }
            ]
        ],
        textures: [
            [
                {
                    texture: api.texture(s1.textures[0][0]),
                    map: [0, 1], // maps.textures[0]
                    entry: 0, index: 0, step: 0, pass: 0,
                    type: 'uint8', width: 32, height: 32, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                },
                {
                    texture: api.texture(s1.textures[0][1]),
                    map: [2], // maps.textures[1]
                    entry: 1, index: 1, step: 0, pass: 1,
                    type: 'uint8', width: 32, height: 32, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                }
            ],
            [
                {
                    texture: api.texture(s1.textures[1][0]),
                    map: [0, 1], // maps.textures[0]
                    entry: 2, index: 0, step: 1, pass: 0,
                    type: 'uint8', width: 32, height: 32, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                },
                {
                    texture: api.texture(s1.textures[1][1]),
                    map: [2], // maps.textures[1]
                    entry: 3, index: 1, step: 1, pass: 1,
                    type: 'uint8', width: 32, height: 32, channels: 4,
                    min: 'nearest', mag: 'nearest', wrap: 'clamp'
                }
            ]
        ]
    };
```


##### Returns


- `object`  `to` The state object, set up with the data resources and     meta information, for use with `getStep` and drawing:
- `object.&lt;number, array.&lt;number, array.&lt;number&gt;&gt;&gt;`  `to.maps` Any given     `state.maps`. See `mapGroups`.
- `array.&lt;array.&lt;object.&lt;texture, string, number, array.&lt;number&gt;&gt;&gt;&gt;`      `to.textures` Textures per step, as arrays of objects of `texture`s and
    meta info. See `to.maps.textures`.
- `array.&lt;array.&lt;object.&lt;framebuffer, number, array.&lt;number&gt;&gt;&gt;&gt;`      `to.passes` Passes per step, as arrays of objects of `framebuffer`s,
    referencing `to.textures`, and meta info. See `to.maps.passes`.
- `array.&lt;framebuffer.&lt;array.&lt;texture&gt;&gt;&gt;`  `to.steps`     Hierarchy of steps of state, as an array of `framebuffer`s from
    `to.passes`, with arrays of `texture`s from `to.textures`, and meta
    information; set up here, or the given `state.steps` if it's an array.
    State data may be drawn into the framebuffers accordingly.
    See `mapGroups` and `getStep`.
- `object.&lt;texture, string, number, array.&lt;number&gt;&gt;`  `to.merge`     Any created object of a merged `texture` and meta info, or the given
    `state.merge` as-is if not handled here. See `getStep` and `macroTaps`.
- `object`  `to.size` Size/type information of the created resources.
- `string`  `to.size.type` Data type of `framebuffer`s and `texture`s.
- `boolean`  `to.size.depth` Whether `framebuffer`s attach depth.
- `boolean`  `to.size.stencil` Whether `framebuffer`s attach stencil.
- `number`  `to.size.channelsMin` Minimum channels in any `texture`.
- `number`  `to.size.steps` Number of `to.steps` in the main flow.
- `number`  `to.size.passes` Number of `to.passes` in `to.steps`.
- `number`  `to.size.framebuffers` Number of `framebuffer`s created.
- `number`  `to.size.textures` Number of `to.textures` in `to.passes`.
- `number`  `to.size.colors` Number of `texture`s created.
- `number`  `to.size.width` Width of `framebuffer`s and `texture`s.
- `number`  `to.size.height` Height of `framebuffer`s and `texture`s.
- `array.&lt;number&gt;`  `to.size.shape` Shape of `framebuffer`s and     `texture`s, as `[to.size.width, to.size.height]`.
- `number`  `to.size.count` Number of entries in each `texture`.
- `object.&lt;number, string, array.&lt;number&gt;&gt;`  `to.size.merge`     Size/type information about any created or given merge texture.
- `number`  `to.stepNow` The currently active state step, as given.
- `number`  `to.passNow` The currently active draw pass, as given.



#### textures() 

The textures created for the `step`/`pass` render flow.






##### Returns


- `Void`



#### passes() 

The passes created for the `step`/`pass` render flow.






##### Returns


- `Void`



#### addTexture() 

Add a texture attachment and meta info to `textures` if applicable; to
return its new `texture` or a reused one to bind to a pass in `passes`.






##### Returns


- `Void`



#### to.texture() 

Denotes attached texture; if merging, textures are reused.






##### Returns


- `Void`



#### to.entry() 

Denotes attached texture entry; if merging, textures are reused.






##### Returns


- `Void`



#### to.color() 

Denotes framebuffer attachments; may reuse underlying textures.






##### Returns


- `Void`



#### addPass() 

Add a pass to `passes`, with its `textures` bound; to return its
`framebuffer` to one of `steps`.






##### Returns


- `Void`



#### channels() 

All a framebuffer's attachments need the same number of channels;
ignored if a `color`'s given as it'll be defined there instead.






##### Returns


- `Void`



#### to() 

Properties passed for framebuffer creation, then meta info.






##### Returns


- `Void`



#### color() 

Map the pass's texture color attachments and their meta info.






##### Returns


- `Void`



#### to.framebuffer() 

The framebuffer for this pass.






##### Returns


- `Void`



#### to.entry() 

Denotes attached texture entry; if merging, textures are reused.






##### Returns


- `Void`



#### to.pass() 

Denotes framebuffer attachments; .






##### Returns


- `Void`




### step.js


#### updateMerge(state) 

Merged texture update, called upon each pass. Copies the active pass's output
into the merged texture, from each of its attachments one by one (to support
multiple draw buffers). Matches the lookup logic defined in `macroTaps`.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| state | `object`  | A GPGPU state of the active pass. | &nbsp; |
| state.passes | `array.<object.<array.<texture>, array.<number>>>`  | Passes per     step; the active one is found via `getPass`, with a `color` array of<br>    `texture`s, and a `map` array of numbers showing how the textures are<br>    grouped into the pass. See `getState` and `mapGroups`. | &nbsp; |
| state.merge | `merge`  | The merged texture to update. | &nbsp; |
| state.stepNow | `number`  | The currently active state step, if any. | *Optional* |




##### Returns


- `texture`  The merged `texture`, updated by the active pass's output;     matches the lookup logic defined in `macroTaps`.



#### getStep(api, state[, onStep, onPass]) 

Creates a GPGPU update step function, for use with a GPGPU state object.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| api | `object`  | An API for GL resources. | &nbsp; |
| api.buffer | `buffer`  | Function to set up a GL buffer. | *Optional* |
| api.clear | `clear`  | Function to clear GL output view or `framebuffer`. | *Optional* |
| api.command&#x3D;api | `command`  | Function to create a GL render pass, given     options, to be called later with options. | *Optional* |
| state | `object`  | The GPGPU state to use. See `getState` and `mapGroups`. | &nbsp; |
| state.maps | `object`  | How values are grouped per-texture per-pass     per-step. See `mapGroups`. | &nbsp; |
| state.passes | `array.<array.<number>>`  | How textures are grouped into     passes. See `mapGroups`. | &nbsp; |
| state.merge | `object`  | Any merged state texture; uses separate state     textures if not given. | *Optional* |
| state.merge.texture | `object`  | The GL texture object in `state.merge`. | *Optional* |
| state.merge.texture.subimage | `subimage`  | A function to update part of     the merge GL texture object data. See `subimage`. | *Optional* |
| state.merge.update | `function`  | Hook to update, if any; if not given,     `state.merge.texture` is updated here with active states upon each pass.<br>    The default merged texture is laid out as `[texture, step]` on the<br>    `[x, y]` axes, respectively; if other layouts are needed, this merge<br>    update hook can be given here to be used as-is, and the setup and<br>    lookup logic in their respective hooks. See `getState` and `macroTaps`. | *Optional* |
| state.pre&#x3D;preDef | `string`  | The namespace prefix; `preDef` by default. | *Optional* |
| state.step&#x3D;to | `object`  | The properties for the step GL command. | *Optional* |
| state.step.vert&#x3D;vertDef | `string`  | The step vertex shader GLSL; a     simple flat screen shader if not given. | *Optional* |
| state.step.frag | `string`  | The step fragment shader GLSL. | &nbsp; |
| state.step.uniforms&#x3D;getUniforms(state) | `object`  | The step uniforms;     modifies any given. See `getUniforms`. | *Optional* |
| state.step.positions&#x3D;positionsDef() | `array.<number>` `buffer`  | The step     position attributes; 3 points of a large flat triangle if not given. | *Optional* |
| state.step.count&#x3D;state.step.positions.length*scale.vec2 | `number`  | The     number of elements/attributes to draw. | *Optional* |
| state.step.passCommand | `object`  | Any GL command properties to mix in     over the default ones here, and passed to `api.command`. | *Optional* |
| state.step.vert&#x3D;vertDef | `string`  | Vertex shader GLSL to add code to. | *Optional* |
| state.step.verts | `array`  | Preprocesses and caches vertex GLSL code     per-pass if given, otherwise processes it just-in-time before each pass. | *Optional* |
| state.step.frag | `string`  | Fragment shader GLSL to add code to. | *Optional* |
| state.step.frags | `array`  | Preprocesses and caches fragment GLSL code     per-pass, otherwise processes it just-in-time before each pass. | *Optional* |
| onStep | `onStep`  | Callback upon each step. | *Optional* |
| onPass | `onPass`  | Callback upon each pass. | *Optional* |
| to&#x3D;(state.step | `object`  | ?? {})] The results object; `state.step` or     a new object if not given. | *Optional* |




##### Returns


- `object`  `to` The given `to` object; containing a GPGPU update     step function and related properties, to be passed a GPGPU state.
- `string`  `to.vert` The given/new `state.vert` vertex shader GLSL.
- `string`  `to.frag` The given `state.frag` fragment shader GLSL.
- `array.string`  `[to.verts]` Any cached pre-processed vertex shaders     GLSL, if `state.step.verts` was given.
- `array.string`  `[to.frags]` Any cached pre-processed fragment     shaders GLSL, if `state.step.verts` was enabled.
- `object`  `to.uniforms` The given `state.uniforms`.
- `number`  `to.count` The given/new `state.count`.
- `buffer`  `to.positions` The given/new `state.positions`; via     `api.buffer`.
- `command`  `to.pass` A GL command function to draw a given pass; via     `api.command`.
- `function`  `to.run` The main step function, which performs all the     draw pass GL commands for a given state step.



#### to.pass() 

The render command describing a full GL state for a step.






##### Returns


- `Void`



#### framebuffer() 

Note that this may draw to the screen if there's no active pass.






##### Returns


- `Void`



#### to.run() 

Executes the next step and all its passes.






##### Returns


- `Void`



#### updateMergeTest() 

A wrapper around `updateMerge` that's handy for testing.






##### Returns


- `Void`




*Documentation generated with [doxdox](https://github.com/neogeek/doxdox).*
