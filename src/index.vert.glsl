/**
 * Default `gpgpu` vertex shader.
 *
 * @see [@epok.tech/gl-screen-triangle/uv-texture.vert.glsl](https://github.com/keeffEoghan/gl-screen-triangle/tree/master/uv-texture.vert.glsl)
 */

precision highp float;

/**
 * Uses the default prefix namespace; replaced with any given prefix if this
 * shader's used during `toStep`.
 *
 * @see {@link const.preDef}
 * @see {@link step.toStep}
 */
attribute vec2 gpgpu_position;

varying vec2 uv;

void main() {
  // Texture coordinates, range `[0, 1]`, y-axis points upwards.
  uv = (gpgpu_position*0.5)+0.5;
  gl_Position = vec4(gpgpu_position, 0, 1);
}
