/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroGPGPUDraw`.
 *
 * @see [getGPGPUDraw]{@link ../draw.js#getGPGPUDraw}
 * @see [macroGPGPUDraw]{@link ../macros.js#macroGPGPUDraw}
 */

#define texturePos GPGPUTexture_0
#define textureLife GPGPUTexture_1
#define textureAcc GPGPUTexture_2

#define channelsPos GPGPUChannels_0
#define channelsLife GPGPUChannels_1
#define channelsAcc GPGPUChannels_2

precision highp float;

attribute float index;

uniform sampler2D states[GPGPUStepsPast*GPGPUTextures];
uniform vec2 dataShape;
uniform float steps;
uniform float pointSize;
uniform vec2 lifetime;

varying float stepIndex;
varying float life;

#pragma glslify: indexGPGPUState = require('../util/index-state');

void main() {
    vec3 lookup = indexGPGPUState(index, dataShape, steps);

    stepIndex = lookup.z;

    vec4 state = texture2D(states[(int(stepIndex)*GPGPUTextures)+texturePos], lookup.xy);
    vec3 pos = state.channelsPos;

    life = state.channelsLife/lifetime[1];

    gl_Position = vec4(pos, 1.0);
    // gl_PointSize = pointSize*life;
    gl_PointSize = pointSize;
}
