/**
 * Default GPGPU vertex shader.
 *
 * @see @epok.tech/gl-screen-triangle/uv-texture.vert.glsl
 */

precision highp float;

attribute vec2 position;

uniform vec4 dataShape;

varying vec2 uv;

// @todo This seems to break unmerged version similarly to merged version.
// const vec2 scale = vec2(0.5, -0.5);

#pragma glslify: offsetUV = require(./sample/offset-uv)

void main() {
    // Texture coordinates.
    // Offset UV to sample a texture center and avoid errors.
    uv = offsetUV((position*0.5)+0.5, dataShape.xy);
    // uv = offsetUV((position*scale)+0.5, dataShape.xy);
    gl_Position = vec4(position, 0, 1);
}
