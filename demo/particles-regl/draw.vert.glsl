/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../../macros.js#macroPass}
 * @see [macroValues]{@link ../../macros.js#macroValues}
 */

precision highp float;

// The texture channels each of the `values` is stored in.
#define positionChannels channels_0
#define motionChannels channels_1
#define lifeChannels channels_2
// Set up sampling logic.
useSamples
// Only the first value derives from all values, giving these minimal `reads`.
useReads_0
// All `derives` here are in one pass (`0`), and in the same order as `values`.
// See `values` for indexing `reads_0_${derives index == values index}`.
#define readPosition1 reads_0_0
#define readMotion reads_0_1
#define readLife reads_0_2
#define readPosition0 reads_0_3

attribute float index;

uniform sampler2D states[stepsPast*textures];
uniform float stepNow;
uniform vec2 dataShape;
uniform vec2 viewShape;
uniform float pointSize;
uniform float dt;
uniform vec2 lifetime;
uniform vec2 pace;
uniform float useVerlet;

varying vec4 color;

#pragma glslify: aspect = require(@epok.tech/glsl-aspect/contain)
#pragma glslify: gt = require(glsl-conditionals/when_gt)

#pragma glslify: indexUV = require(../../sample/index-uv)

#if stepsPast > 1
    // If multiple steps are given, shift into past steps.
    #pragma glslify: indexPairs = require(../../index-pairs)
#endif

void main() {
    #if stepsPast > 1
        // If multiple steps are given, find past step and entry.
        vec2 stepEntry = indexPairs(index, stepsPast);
        float stepPast = stepEntry.s;
        float entry = stepEntry.t;
    #else
        // If only 1 step is given, past step and entry are known.
        float stepPast = 0.0;
        float entry = index;
    #endif

    // Turn the 1D index into a 2D texture UV; offset to sample at the texel
    // center and avoid errors.
    vec2 st = indexUV(entry+0.5, dataShape);

    // Can also use the `reads` logic to take the minimum possible samples here.
    // Sample the desired state values - creates the `data` array.
    #if stepsPast > 1
        // Shift into past steps.
        /**
         * @todo Fix GLSL3/D3D error "sampler array index must be a literal
         *     expression". See info in `macroSamples` in `macros.js`.
         */
        tapStateBy(st, stepPast, 0)
    #else
        // No past steps, no shift.
        tapState(st)
    #endif

    // Read values.
    vec3 position0 = data[readPosition0].positionChannels;
    vec3 position1 = data[readPosition1].positionChannels;
    vec3 velocity = data[readMotion].motionChannels;
    float life = data[readLife].lifeChannels;

    #if stepsPast > 1
        float ratioNow = 1.0-(stepPast/float(stepsPast-1));
    #else
        float ratioNow = 1.0;
    #endif

    float alive = gt(life, 0.0);
    vec2 ar = aspect(viewShape);
    vec4 vertex = vec4(position1.xy*ar, position1.z, 1.0);
    float depth = clamp(1.0-(vertex.z/vertex.w), 0.1, 1.0);

    gl_Position = alive*vertex;
    gl_PointSize = alive*pointSize*depth*mix(0.1, 1.0, ratioNow);

    float a = pow(life/lifetime.t, 0.3)*pow(ratioNow, 0.3);
    float speed = length(mix(velocity, position1-position0, useVerlet)/dt);

    color = a*vec4(mix(0.2, 1.0, ratioNow), mix(0.2, 1.0, entry/float(count)),
        clamp(pow(speed*pace.s, pace.t), 0.0, 1.0), a);
}
