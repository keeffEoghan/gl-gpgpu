/**
 * Description of the `api` hooks for `gpgpu`, to interact with `GL` resources.
 *
 * Not implemented within the `gpgpu` library.
 *
 * Based on [`regl`](https://github.com/regl-project/regl/)'s API; but can be
 * use any `GL` renderer, given hooks matching these implementations.
 *
 * @module
 * @category API Hooks
 *
 * @todo [Fix `@callback`/`@typedef`](https://github.com/TypeStrong/typedoc/issues/1896):
 *   nested `@param`; omits `@return`/`@see`/`@this`
 */

/**
 * @callback getFramebuffer
 * A `function` to create or update a `GL` `framebuffer`; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link framebuffer}
 * - {@link data.toData}
 *
 * **This**
 *
 * Updates any `this` value's `framebuffer` in-place (or similar handling);
 * otherwise if `null`ish, returns a new `framebuffer`.
 *
 * **Returns**
 *
 * A `GL` `framebuffer` created or updated by any given `options`, or an
 * `object` serving that purpose.
 *
 * @param {{
 *     depth?:object,
 *     stencil?:object,
 *     width?:number,
 *     height?:number,
 *     color?:texture[]
 *   }} options Options to create or update a `GL` `framebuffer`; with:
 *   - `depth`: Any `framebuffer` depth attachment, or a flag for whether it
 *     should be created.
 *   - `stencil`: Any `framebuffer` stencil attachment, or a flag for whether it
 *     should be created.
 *   - `width`: The width of the `framebuffer`.
 *   - `height`: The height of the `framebuffer`.
 *   - `color`: The `texture` attachments to use.
 *
 * @returns {framebuffer}
 */

/**
 * @callback useFramebuffer
 * Bind a `GL` `framebuffer` while calling a given `function`; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link framebuffer}
 * - {@link step.toStep}
 *
 * **This**
 *
 * Uses any `this` value's `framebuffer` (or similar handling).
 *
 * @param {()=>void} hook A `function` to call while the `framebuffer` is bound.
 */

/**
 * @typedef {object} framebuffer
 * A `GL` `framebuffer`, or an `object` serving that purpose; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link getFramebuffer}
 * - {@link data.toData}
 *
 * @prop {getFramebuffer} call Update this `framebuffer` in-place.
 * @prop {useFramebuffer} use Bind this `framebuffer` for the given `function`.
 */

/**
 * @callback getTexture
 * A `function` hook to create or update a `GL` `texture`; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link api}
 * - {@link texture}
 * - {@link data.toData}
 *
 * **Returns**
 *
 * A `GL` `texture`, or an `object` serving that purpose.
 *
 * @param {string} type Any `texture` data type value.
 * @param {string} min Any `texture` minification filter value.
 * @param {string} mag Any `texture` magnification filter value.
 * @param {string} wrap Any `texture` wrap mode value.
 * @param {number} width The width of the `texture`.
 * @param {number} height The height of the `texture`.
 * @param {number} channels The number of channels of the `texture`.
 *
 * @returns {texture}
 */

/**
 * @callback subimage
 * Copy from a given source `texture` to part of `this` output `texture`; via
 * a `GL` `api`.
 *
 * **See**
 *
 * - {@link api}
 * - {@link texture}
 * - {@link getTexture}
 * - {@link step.toStep}
 *
 * **Returns**
 *
 * The output `texture`, `this`; the source `texture` copied to part of it.
 *
 * **This**
 *
 * Uses any `this` value's `texture` as the output to copy into.
 *
 * @param {texture} source A `texture` to copy to part of the output `texture`.
 * @param {number} [x=0] Offset along the output `texture`'s x-axis.
 * @param {number} [y=0] Offset along the output `texture`'s y-axis.
 *
 * @returns {texture}
 */

/**
 * @typedef {object} texture
 * A `GL` `texture`, or an `object` serving that purpose; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link getTexture}
 * - {@link data.toData}
 *
 * @prop {getTexture} call Update this `texture` in-place.
 * @prop {subimage} subimage Copy from a source `texture` into part of `this`
 *   destination `texture`.
 */

/**
 * @callback getBuffer
 * A `function` to set up a `GL` buffer; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link buffer}
 * - {@link attributes.getAttributes}
 *
 * @param {number[]|{[k:string|number]:number}|buffer} data Data to create a new
 *   `buffer`; or an existing `buffer` to use as-is.
 *
 * @returns {buffer}
 */

/**
 * @typedef {object} buffer
 * A `GL` `buffer` for vertex `attribute`s, or an `object` serving that purpose;
 * via a `GL` `api`.
 */

/**
 * @callback clear
 * A `function` to clear `GL` output view or `framebuffer`; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link framebuffer}
 * - {@link step.toStep}
 *
 * @param {{
 *     color?:number[],
 *     depth?:number,
 *     stencil?:number,
 *     framebuffer?:framebuffer
 *   }} options Options to clear `GL`; with:
 *   - `color`: The values to clear any color buffers with.
 *   - `depth`: The value to clear any depth buffer with.
 *   - `stencil`: The value to clear any stencil buffer with.
 *   - `framebuffer`: Any `framebuffer` to clear; if not given, clears any
 *     `framebuffer` already bound, or the view if none are bound.
 */

/**
 * @callback command
 * A `function` to create a `GL` render pass execution `function`, to be called
 * later, given options, for a render pass; via a `GL` `api`.
 *
 * **See**
 *
 * - {@link buffer}
 * - {@link attributes}
 * - {@link framebuffer}
 * - {@link step.toStep}
 * - {@link uniforms.toUniforms}
 * - {@link uniforms.getUniform}
 *
 * **Returns**
 *
 * A `function` to execute a `GL` render pass, given options.
 *
 * @param {{
 *     vert?:(context,state)=>string,
 *     frag?:(context,state)=>string,
 *     count?:number,
 *     attributes?:{[k:string]:buffer},
 *     uniforms?:{[k:string]:getUniform},
 *     depth?:{[k:string]:boolean|{}},
 *     framebuffer?:(context,state)=>framebuffer
 *   }} options Options to create a `GL` render pass `function`; with:
 *   - `vert`: Hook to get any `GLSL` vertex shader `string`.
 *   - `frag`: Hook to get any `GLSL` fragment shader `string`.
 *   - `count`: Any `number` of elements to render.
 *   - `attributes`: Map of any `GL` `attribute` `buffer`s.
 *     See `attributes`, `buffer`, `toStep`.
 *   - `uniforms`: Map of any `GL` `uniform` hooks.
 *     See `uniforms`, `toUniforms`, and `getUniform`.
 *   - `depth`: Any `GL` depth settings (e.g: `options.depth.enable`).
 *   - `framebuffer`: Hook to get any `framebuffer` to render into.
 *     See `framebuffer`.
 *
 * @returns {(context,state)=>void}
 */

/**
 * @typedef {{
 *     framebuffer:getFramebuffer,
 *     texture:getTexture,
 *     buffer:getBuffer,
 *     clear:clear,
 *     command:command,
 *     call:command
 *   }} api
 * An API `object` given to `gpgpu`, to interact with `GL` resources.
 *
 * Based on [`regl`](https://github.com/regl-project/regl/)'s API; but can be
 * use any `GL` renderer, given hooks matching these implementations.
 */

/** @ignore */
export default null;
