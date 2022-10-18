/**
 * Default `gpgpu` vertex shader.
 *
 * @see [@epok.tech/gl-screen-triangle/uv-texture.vert.glsl](https://github.com/keeffEoghan/gl-screen-triangle/tree/master/uv-texture.vert.glsl)
 */

precision highp float;

attribute vec2 position;

varying vec2 uv;

void main() {
  // Texture coordinates, range `[0, 1]`, y-axis points upwards.
  uv = (position*0.5)+0.5;
  gl_Position = vec4(position, 0, 1);
}
