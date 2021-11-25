/**
 * GPGPU defaults and constants.
 */

import { positions } from '@epok.tech/gl-screen-triangle';

export { default as vertDef }
    from '@epok.tech/gl-screen-triangle/uv-texture.vert.glsl';

// The required and optional GL extensions for a GPGPU state.

export const extensions = () => [];

// To draw to `float` buffers.
export const extensionsFloat = () =>
    ['oes_texture_float', 'webgl_color_buffer_float'];

// To draw to `half float` buffers.
export const extensionsHalfFloat = () =>
    ['oes_texture_half_float', 'ext_color_buffer_half_float'];

export const optionalExtensions = () => ['webgl_draw_buffers'];

/**
 * Default properties for GPGPU and GL capabilities and resources.
 */

// Prefix namespace to avoid naming clashes.
export const preDef = '';

// The allowable range of channels for framebuffer attachments.
// Default avoids `RGB32F` framebuffer attachments, which errors on
// Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1448632
export const channelsMinDef = 4;
export const channelsMaxDef = 4;

export const texturesMaxDef = 1;
export const boundDef = 1;
export const scaleDef = 10;
export const stepsDef = 2;
export const valuesDef = () => [channelsMaxDef];
export const positionsDef = () => [...positions];

// Resource format defaults.
export const typeDef = 'float';
export const minDef = 'nearest';
export const magDef = 'nearest';
export const wrapDef = 'clamp';
export const depthDef = false;
export const stencilDef = false;
