/**
 * Outputs the GPGPU step data.
 * Requires setup with preprocessor macros - see `macroGPGPUDraw`.
 *
 * @see [macroGPGPUStepPass]{@link ../macros.js#macroGPGPUStepPass}
 * @see [macroGPGPUDraw]{@link ../macros.js#macroGPGPUDraw}
 */

precision highp float;

const int numStates = GPGPUStepsPast*GPGPUTextures;
const int numChannels = 4;

uniform sampler2D states[numStates];
uniform vec2 dataRange;
uniform vec2 drawRange;
uniform vec2 viewShape;

varying vec2 uv;

const vec2 splits = vec2(GPGPUStepsPast, GPGPUTextures);
const vec4 ndcRange = vec4(-1, -1, 1, 1);
const vec4 stRange = vec4(0, 0, 1, 1);
// const float gapSize = 1.0;

#pragma glslify: map = require('glsl-map');

void main() {
    vec2 st = map(uv, ndcRange.xy, ndcRange.zw, stRange.xy, stRange.zw);

    // vec2 splitGaps = (splits+vec2(1.0))*gapSize;

    // vec2 gaps = splitGaps/viewShape;
    // vec2 gap = gapSize/viewShape;

    vec2 scaled = st*splits;
    // vec2 scaled = (st*splits)+gaps;
    // vec2 scaled = st*(splits+gaps);
    // vec2 scaled = (st*splits)-gaps;

    vec4 data;
    vec2 lookup = fract(scaled);
    int s = (int(scaled.x)*int(splits.y))+int(scaled.y);

    for(int i = numStates-1; i >= 0; --i) {
        if(i == s) {
            data = texture2D(states[i], lookup);
            break;
        }
    }

    vec3 pixel;
    // int p = int(float(s)/float(numStates*numChannels));
    int p = int(scaled.y*float(numChannels));

    if(p > 2) {
        pixel = vec3(data[3]);
    }
    else {
        for(int i = 0; i < numChannels; --i) {
            if(i == p) {
                pixel[i] = data[i];
            }
        }
    }

    vec3 lookupBlocks = vec3(lookup, length(st));

    gl_FragColor = map(data,
        vec4(dataRange.x), vec4(dataRange.y),
        vec4(drawRange.x), vec4(drawRange.y));

    // gl_FragColor = vec4(map(pixel,
    //         vec3(dataRange.x), vec3(dataRange.y),
    //         vec3(drawRange.x), vec3(drawRange.y)),
    //     1.0);

    // gl_FragColor = vec4(data.xyz, 1);
    // gl_FragColor = vec4(pixel, 1.0);
    // gl_FragColor = vec4(uv, 0, 1);
    // gl_FragColor = vec4(st, 0, 1);
    // gl_FragColor = vec4(mod(scaled, float(numStates)), 0, 1);
    // gl_FragColor = vec4(lookupBlocks, 1);

    gl_FragColor.a = 1.0;
}
