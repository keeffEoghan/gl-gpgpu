/**
 * Default properties for `gpgpu` and `GL` capabilities and resources.
 *
 * @module
 * @category JS
 */
import { positions, count } from '@epok.tech/gl-screen-triangle';

import vertGLSL from './index.vert.glsl';

/** Default vertex shader `GLSL` code. */
export const vertDef = vertGLSL;

/**
 * Default vertex positions `attribute`; 3 points of a large flat triangle.
 *
 * @see {@link step.toStep}
 */
export const positionsDef = positions;

/**
 * Default vertex `count`; 3 points of a large flat triangle.
 *
 * @see {@link step.toStep}
 */
export const countDef = count;

// The required and optional `GL` extensions for a `gpgpu` state.

/** Default required `GL` extensions; none. */
export const extensions = [];

/** Default required `GL` extensions to render to `float` buffers. */
export const extensionsFloat =
  ['oes_texture_float', 'webgl_color_buffer_float'];

/** Default required `GL` extensions to render to `half float` buffers. */
export const extensionsHalfFloat =
  ['oes_texture_half_float', 'ext_color_buffer_half_float'];

/** Default optional `GL` extensions; update more data in one render pass. */
export const optionalExtensions = ['webgl_draw_buffers'];

/**
 * Prefix namespace to avoid naming clashes; recommended.
 *
 * @see {@link index.vert.glsl}
 */
export const preDef = 'gpgpu_';

/**
 * Default minimum allowable channels for `framebuffer` attachments.
 * This avoids `RGB32F` `framebuffer` attachments, which errors on Firefox.
 *
 * @see {@link state.framebuffer}
 * @see [Firefox `RGB32F` bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1448632)
 */
export const channelsMinDef = 4;

/**
 * Default minimum allowable channels for `framebuffer` attachments.
 * This avoids `RGB32F` `framebuffer` attachments, which errors on Firefox.
 *
 * @see {@link state.framebuffer}
 * @see [Firefox `RGB32F` bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1448632)
 */
export const channelsMaxDef = 4;

/**
 * Default maximum `texture`s bound per pass.
 *
 * @see {@link state.framebuffer}
 * @see {@link state.texture}
 */
export const buffersMaxDef = 1;

/**
 * Default how many steps are bound as outputs, unavailable as input; for
 * platforms forbidding read/write of same buffer.
 */
export const boundDef = 1;

/**
 * Default length of the data `texture`s sides to allocate; gives a square
 * power-of-two `texture` raising 2 to this power.
 */
export const scaleDef = 9;

/**
 * Default width of the data `texture`s sides to allocate; gives a square
 * power-of-two `texture` raising 2 to the default scale.
 *
 * @see {@link state.framebuffer}
 * @see {@link state.texture}
 */
export const widthDef = 2**scaleDef;

/**
 * Default height of the data `texture`s sides to allocate; gives a square
 * power-of-two `texture` raising 2 to the default scale.
 *
 * @see {@link state.framebuffer}
 * @see {@link state.texture}
 */
export const heightDef = 2**scaleDef;

/** Default number steps of state to track. */
export const stepsDef = 2;
/** Default values to track; gives 1 set of `texture` channels. */
export const valuesDef = [channelsMaxDef];

// `GL` resource format defaults.

/**
 * Default `texture` data type.
 *
 * @see {@link state.texture}
 */
export const typeDef = 'float';

/**
 * Default `texture` minification filter.
 *
 * @see {@link state.texture}
 */
export const minDef = 'nearest';

/**
 * Default `texture` magnification filter.
 *
 * @see {@link state.texture}
 */
export const magDef = 'nearest';

/**
 * Default `texture` wrap mode, avoid `WebGL1` needing power-of-2 `texture`.
 *
 * @see {@link state.texture}
 */
export const wrapDef = 'clamp';

/**
 * Default `framebuffer` depth attachment.
 *
 * @see {@link state.framebuffer}
 */
export const depthDef = false;

/**
 * Default `framebuffer` stencil attachment.
 *
 * @see {@link state.framebuffer}
 */
export const stencilDef = false;

/**
 * A `RegExp` to find the `GLSL` version `number` in a `GL` parameter
 * `SHADING_LANGUAGE_VERSION` formatted `string`.
 */
export const glslRx = /[0-9\.]+/;

/**
 * Set a maximum to guard against number overflow.
 *
 * @todo Should be `(2**15)-1` for `mediump`, but seems to fail above `2**13`.
 * @see [SO](https://stackoverflow.com/a/67791670/716898)
 */
export const stepMaxDef = 2**13;

/**
 * Default clear settings to clear each pass's `framebuffer`.
 *
 * @see {@link step.toStep}
 * @see {@link api.clear}
 * @see {@link api.framebuffer}
 *
 * @type {{color:[0,0,0,0],depth:1,stencil:0,framebuffer?:framebuffer}}
 * @prop {framebuffer} [framebuffer] Any `framebuffer` to clear, set upon each
 *   pass.
 */
export const clearPassDef = { color: [0, 0, 0, 0], depth: 1, stencil: 0 };

/**
 * Default `getFramebuffer` options, to bind a given `color` to it.
 *
 * @see {@link step.updateMerge}
 * @see {@link api.framebuffer}
 * @see {@link api.getFramebuffer}
 *
 * @prop {texture|null} color Any `texture` to bind as a `framebuffer` output.
 */
export const copyFrameDef = { color: null };

/**
 * Default `texture.subimage` options, to bind a given `color`.
 *
 * @see {@link step.updateMerge}
 * @see {@link api.texture}
 * @see {@link api.subimage}
 *
 * @prop {true} copy Indicates `texture.subimage` should copy data from the
 *   currently-bound `framebuffer`.
 */
export const copyImageDef = { copy: true };
