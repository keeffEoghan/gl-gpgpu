/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../../macros.js#macroPass}
 * @see [macroValues]{@link ../../macros.js#macroValues}
 */

precision highp float;

// The texture channels each of the `values` is stored in.
#define posChannels channels_0
#define accChannels channels_1
#define lifeChannels channels_2
// Set up sampling logic.
useSamples
// Only the first value derives from all values, giving these minimal `reads`.
useReads_0
// All `derives` here are in one pass (`0`), and in the same order as `values`.
// See `values` for indexing (`reads_0_${derives index == values index}`).
#define readPos reads_0_0
#define readAcc reads_0_1
#define readLife reads_0_2

attribute float index;

uniform sampler2D states[stepsPast*textures];
uniform vec2 dataShape;
uniform vec2 viewShape;
uniform float pointSize;
uniform vec2 lifetime;
uniform vec2 force;
uniform float dt;
uniform float scale;

varying vec4 color;

#pragma glslify: aspect = require(@epok.tech/glsl-aspect/contain)
#pragma glslify: gt = require(glsl-conditionals/when_gt)

#if stepsPast > 1
    // If multiple steps are given, shift into past steps.
    #pragma glslify: indexPairs = require(../../index-pairs)
#endif

void main() {
    float stepsPastF = float(stepsPast);

    #if stepsPast > 1
        // If multiple steps are given, find past step and entry, and shift.
        vec2 stepEntry = indexPairs(index, stepsPastF);
        float stepPast = stepEntry.s;
        float entry = stepEntry.t;
        ivec2 tapShift = ivec2(int(stepPast), 0);
    #else
        // If only 1 step is given, past step and entry are known, don't shift.
        float stepPast = 0.0;
        float entry = index;
        ivec2 tapShift = ivec2(0);
    #endif

    // Turn the 1D index into a 2D texture UV.
    // Add pixel offset to sample from the pixel's center and avoid errors.
    vec2 uv = vec2(mod(entry+0.25, dataShape.x)/dataShape.x,
        (floor(entry/dataShape.x)+0.25)/dataShape.y);

    // Can also use the `reads` logic to take the minimum possible samples here.
    // Sample the desired state values - creates the `data` array.
    tapSamplesAdd(states, uv, textures, tapShift)

    // Read values.
    vec3 pos = data[readPos].posChannels;
    float life = data[readLife].lifeChannels;
    vec3 acc = data[readAcc].accChannels;

    float ratioPast = stepPast/max(stepsPastF-1.0, 1.0);
    float alive = gt(life, 0.0);
    vec2 ar = aspect(viewShape);
    vec4 vertex = vec4(vec3(pos.xy*ar, pos.z)*scale, 1.0);

    gl_Position = alive*vertex;

    gl_PointSize = alive*pointSize*clamp(1.0-(vertex.z/vertex.w), 0.1, 1.0)*
        mix(1.0, 0.1, ratioPast);

    float a = pow(life/lifetime.t, 0.1);
    // To help accuracy of very small numbers, pass force as `[S, T] = SeT`.
    float f = force.s*pow(10.0, force.t);

    color = a*vec4(ratioPast, entry/float(count),
        clamp((length(acc)/f/dt)*scale, 0.0, 1.0), a);
}
