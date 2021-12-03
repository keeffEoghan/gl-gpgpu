/**
 * Default properties for GPGPU and GL capabilities and resources.
 */

import { positions } from '@epok.tech/gl-screen-triangle';

/** Default vertex shader. */
export { default as vertDef } from './index.vert.glsl';

// The required and optional GL extensions for a GPGPU state.

/** Default required extensions; none. */
export const extensions = () => [];

/** Default required extensions to draw to `float` buffers. */
export const extensionsFloat = () =>
    ['oes_texture_float', 'webgl_color_buffer_float'];

/** Default required extensions to draw to `half float` buffers. */
export const extensionsHalfFloat = () =>
    ['oes_texture_half_float', 'ext_color_buffer_half_float'];

/** Default optional extensions; update more data in one render pass. */
export const optionalExtensions = () => ['webgl_draw_buffers'];

/** Prefix namespace to avoid naming clashes. */
export const preDef = '';

/**
 * The allowable range of channels for framebuffer attachments.
 * Default avoids `RGB32F` framebuffer attachments, which errors on
 * Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1448632
 */
export const channelsMinDef = 4;
export const channelsMaxDef = 4;

export const texturesMaxDef = 1;
export const boundDef = 1;
export const scaleDef = 10;
export const stepsDef = 2;
export const valuesDef = () => [channelsMaxDef];
export const positionsDef = () => [...positions];

// Resource format defaults.

/** Default texture data type. */
export const typeDef = 'float';
/** Default texture minification filter. */
export const minDef = 'nearest';
/** Default texture magnification filter. */
export const magDef = 'nearest';
/** Default texture wrap mode. */
export const wrapDef = 'clamp';
/** Default framebuffer depth attachment. */
export const depthDef = false;
/** Default framebuffer stencil attachment. */
export const stencilDef = false;
