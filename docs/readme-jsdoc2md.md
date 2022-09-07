## Modules

* [const](#module_const)
    * [`.extensions`](#module_const.extensions)
    * [`.extensionsFloat`](#module_const.extensionsFloat)
    * [`.extensionsHalfFloat`](#module_const.extensionsHalfFloat)
    * [`.optionalExtensions`](#module_const.optionalExtensions)
    * [`.preDef`](#module_const.preDef)
    * [`.channelsMinDef`](#module_const.channelsMinDef)
    * [`.channelsMaxDef`](#module_const.channelsMaxDef)
    * [`.buffersMaxDef`](#module_const.buffersMaxDef)
    * [`.boundDef`](#module_const.boundDef)
    * [`.scaleDef`](#module_const.scaleDef)
    * [`.widthDef`](#module_const.widthDef)
    * [`.heightDef`](#module_const.heightDef)
    * [`.stepsDef`](#module_const.stepsDef)
    * [`.valuesDef`](#module_const.valuesDef)
    * [`.positionsDef`](#module_const.positionsDef)
    * [`.typeDef`](#module_const.typeDef)
    * [`.minDef`](#module_const.minDef)
    * [`.magDef`](#module_const.magDef)
    * [`.wrapDef`](#module_const.wrapDef)
    * [`.depthDef`](#module_const.depthDef)
    * [`.stencilDef`](#module_const.stencilDef)
    * [`.mergeDef`](#module_const.mergeDef)
* [index-forms/index-entries](#module_index-forms/index-entries) : <code>string.&lt;glsl&gt;</code>
* [index-forms/index-states](#module_index-forms/index-states) : <code>string.&lt;glsl&gt;</code>
* [index-forms](#module_index-forms) ⇒ <code>number</code>
    * [`.default()`](#module_index-forms.default)
* [gl-gpgpu](#module_gl-gpgpu)
    * [`.gpgpu(api, [state], [to])`](#module_gl-gpgpu.gpgpu) ⇒ <code>object</code>
    * [`.default()`](#module_gl-gpgpu.default)
* [vert](#module_vert) : <code>string.&lt;glsl&gt;</code>
* [inputs](#module_inputs)
    * _static_
        * [`.getUniforms(state, [to])`](#module_inputs.getUniforms) ⇒ <code>object.&lt;number, array.&lt;number&gt;, \*, getUniform&gt;</code>
            * [`~addTextures()`](#module_inputs.getUniforms..addTextures)
        * [`.default()`](#module_inputs.default)
    * _inner_
        * [`~to[undefined]()`](#module_inputs..to[undefined])
        * [`~getUniform`](#module_inputs..getUniform) ⇒ <code>number</code> \| <code>array.&lt;number&gt;</code> \| <code>\*</code>
* [lookup/index-uv](#module_lookup/index-uv) : <code>string.&lt;glsl&gt;</code>
* [lookup/offset-uv](#module_lookup/offset-uv) : <code>string.&lt;glsl&gt;</code>
* [macros](#module_macros)
    * [`.cr`](#module_macros.cr)
    * [`.rgba`](#module_macros.rgba)
    * [`.cache`](#module_macros.cache)
    * [`.id`](#module_macros.id)
    * [`.hooks`](#module_macros.hooks)
    * [`.getGLSLListBase`](#module_macros.getGLSLListBase) ⇒ <code>string</code>
    * [`.getGLSL1ListLike`](#module_macros.getGLSL1ListLike) ⇒ <code>string</code>
    * [`.getGLSL1ListArray`](#module_macros.getGLSL1ListArray) ⇒ <code>string</code>
    * [`.getGLSL3List`](#module_macros.getGLSL3List) ⇒ <code>string</code>
    * [`.getGLSLList`](#module_macros.getGLSLList) ⇒ <code>string</code>
    * [`.macroPass`](#module_macros.macroPass) ⇒ <code>string</code>
    * [`.hasMacros([props], [key], [on], [macros])`](#module_macros.hasMacros) ⇒ <code>string</code> \| <code>null</code> \| <code>\*</code>
    * [`.macroValues(state, [on])`](#module_macros.macroValues) ⇒ <code>string</code>
    * [`.macroOutput(state, [on])`](#module_macros.macroOutput) ⇒ <code>string</code>
    * [`.macroSamples(state, [on])`](#module_macros.macroSamples) ⇒ <code>string</code>
    * [`.macroTaps(state, [on])`](#module_macros.macroTaps) ⇒ <code>string</code>
        * [`~texture`](#module_macros.macroTaps..texture)
        * [`~f`](#module_macros.macroTaps..f)
        * [`~by`](#module_macros.macroTaps..by)
        * [`~aka`](#module_macros.macroTaps..aka)
        * [`~st`](#module_macros.macroTaps..st)
        * [`~t`](#module_macros.macroTaps..t)
        * [`~tapsSamples`](#module_macros.macroTaps..tapsSamples)
    * [`.default()`](#module_macros.default)
* [maps](#module_maps)
    * [`.cache`](#module_maps.cache)
    * [`.validValue(value, [channelsMax])`](#module_maps.validValue) ⇒ <code>boolean</code>
    * [`.packValues(values, [channelsMax], [to])`](#module_maps.packValues) ⇒ <code>array.&lt;number&gt;</code>
    * [`.mapGroups([maps], [to])`](#module_maps.mapGroups) ⇒ <code>object</code> \| <code>array.&lt;array.&lt;number&gt;&gt;</code> \| <code>array.&lt;array.&lt;number&gt;&gt;</code> \| <code>array.&lt;number&gt;</code> \| <code>number</code> \| <code>number</code> \| <code>array.&lt;number&gt;</code> \| <code>array.&lt;number&gt;</code> \| <code>array.&lt;number&gt;</code>
    * [`.mapSamples(maps, [to])`](#module_maps.mapSamples) ⇒ <code>object</code> \| <code>array.&lt;array.&lt;array.&lt;number&gt;&gt;&gt;</code> \| <code>array.&lt;array.&lt;array.&lt;number&gt;&gt;&gt;</code> \| <code>true</code> \| <code>array.&lt;true, number, array.&lt;true, number, array.&lt;true, number&gt;&gt;&gt;</code>
    * [`.mapFlow([maps], [to])`](#module_maps.mapFlow) ⇒ <code>object</code>
    * [`.default()`](#module_maps.default)
* [size](#module_size)
    * [`.getWidth`](#module_size.getWidth) ⇒ <code>number</code>
    * [`.getHeight`](#module_size.getHeight) ⇒ <code>number</code>
    * [`.countDrawIndexes`](#module_size.countDrawIndexes) ⇒ <code>number</code>
    * [`.getDrawIndexes`](#module_size.getDrawIndexes) ⇒ <code>array.&lt;number&gt;</code>
    * [`.getScaled`](#module_size.getScaled) ⇒
* [state](#module_state)
    * _static_
        * [`.getState(api, [state], [to])`](#module_state.getState) ⇒ <code>object</code> \| <code>object.&lt;number, array.&lt;number, array.&lt;number&gt;&gt;&gt;</code> \| <code>array.&lt;array.&lt;object.&lt;texture, string, number, array.&lt;number&gt;&gt;&gt;&gt;</code> \| <code>array.&lt;array.&lt;object.&lt;framebuffer, number, array.&lt;number&gt;&gt;&gt;&gt;</code> \| <code>array.&lt;framebuffer.&lt;array.&lt;texture&gt;&gt;&gt;</code> \| <code>undefined</code> \| <code>\*</code> \| <code>object.&lt;texture, string, number, array.&lt;number&gt;&gt;</code> \| <code>object</code> \| <code>string</code> \| <code>boolean</code> \| <code>boolean</code> \| <code>number</code> \| <code>number</code> \| <code>number</code> \| <code>number</code> \| <code>number</code> \| <code>number</code> \| <code>number</code> \| <code>number</code> \| <code>array.&lt;number&gt;</code> \| <code>number</code> \| <code>undefined</code> \| <code>object.&lt;number, string, array.&lt;number&gt;&gt;</code> \| <code>number</code> \| <code>number</code>
            * [`~colorPool`](#module_state.getState..colorPool)
            * [`~mergeChannels`](#module_state.getState..mergeChannels)
            * [`~size`](#module_state.getState..size)
            * [`~textures`](#module_state.getState..textures)
            * [`~passes`](#module_state.getState..passes)
            * [`~mScaled`](#module_state.getState..mScaled)
            * [`~mw`](#module_state.getState..mw)
            * [`~passChannels()`](#module_state.getState..passChannels)
            * [`~addTexture()`](#module_state.getState..addTexture)
            * [`~addPass()`](#module_state.getState..addPass)
        * [`.default()`](#module_state.default)
    * _inner_
        * [`~texture`](#module_state..texture) ⇒ <code>\*</code>
        * [`~framebuffer`](#module_state..framebuffer) ⇒ <code>\*</code>
* [step](#module_step)
    * _static_
        * [`.getPass`](#module_step.getPass) ⇒ <code>object</code>
        * [`.updateMerge(state)`](#module_step.updateMerge) ⇒ <code>texture</code>
            * [`~y`](#module_step.updateMerge..y)
        * [`.getStep(api, state, [onStep], [onPass], [to])`](#module_step.getStep) ⇒ <code>object</code> \| <code>string</code> \| <code>string</code> \| <code>array.string</code> \| <code>array.string</code> \| <code>object</code> \| <code>number</code> \| <code>buffer</code> \| <code>command</code> \| <code>function</code>
        * [`.updateMergeTest()`](#module_step.updateMergeTest)
        * [`.default()`](#module_step.default)
    * _inner_
        * [`~buffer`](#module_step..buffer) ⇒ <code>\*</code> \| <code>number</code> \| <code>number</code>
        * [`~clear`](#module_step..clear) : <code>function</code>
        * [`~command