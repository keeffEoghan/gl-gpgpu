/**
 * Default GPGPU vertex shader.
 *
 * @see @epok.tech/gl-screen-triangle/uv-texture.vert.glsl
 */

precision highp float;

attribute vec2 position;

// uniform vec4 dataShape;

varying vec2 uv;

#pragma glslify: offsetUV = require(./sample/offset-uv)

void main() {
    // Texture coordinates.
    // Offset UV to sample a texture center and avoid errors.
    // @todo Results in weird offsets like [0.38, 0.63] instead of [0.25, 0.75].
    // uv = offsetUV((position*0.5)+0.5, dataShape.xy);
    // uv = offsetUV((position*0.5)+0.5);
    uv = (position*0.5)+0.5;
    gl_Position = vec4(position, 0, 1);
}
