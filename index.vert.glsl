/**
 * Default GPGPU vertex shader.
 *
 * @see @epok.tech/gl-screen-triangle/uv-texture.vert.glsl
 */

precision highp float;

attribute vec2 position;

uniform vec2 dataShape;

varying vec2 uv;

#pragma glslify: offsetUV = require(./sample/offset-uv)

void main() {
    // Transform UV NDC to texture coordinates.
    // Offset UV to sample at the texel center and avoid errors.
    uv = offsetUV((position*0.5)+0.5, dataShape);
    gl_Position = vec4(position, 0, 1);
}
