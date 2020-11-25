/**
 * GPGPU defaults and constants.
 */

import { positions } from '@epok.tech/gl-screen-triangle';

export { default as vertDef }
    from '@epok.tech/gl-screen-triangle/index.vert.glsl';

/**
 * The required and optional GL extensions for a GPGPU state.
 *
 * @todo
 * For drawing into floating-point buffers:
 * `oes_texture_float` and `oes_texture_half_float` are required dependencies of
 * `webgl_color_buffer_float` and `ext_color_buffer_half_float`, respectively.
 *
 * @todo Can these be optional? Fallbacks? `ext_color_buffer_half_float`?
 */
export const extensions = () =>
    ['oes_texture_float', 'webgl_color_buffer_float'];

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
export const typeDef = 'float';
export const valuesDef = () => [channelsMaxDef];
export const positionsDef = () => [...positions];
