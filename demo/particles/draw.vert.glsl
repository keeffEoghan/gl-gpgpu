/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../../macros.js#macroPass}
 * @see [macroValues]{@link ../../macros.js#macroValues}
 */

#define posChannels channels_0
#define lifeChannels channels_1
#define accChannels channels_2

useSamples

// Only the first value derives from all values, giving these minimal `reads`.
useReads_0
#define readPos reads_0_0
#define readLife reads_0_1
#define readAcc reads_0_2

precision highp float;

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
    #pragma glslify: indexPairs = require(../../index-pairs)
#endif

void main() {
    #if stepsPast > 1
        // If multiple steps are given, use `gl.LINES`, shift into past steps.
        vec2 stepEntry = indexPairs(index, float(stepsPast));
        float stepPast = stepEntry.s;
        float entry = stepEntry.t;
        ivec2 stepShift = ivec2(int(stepPast), 0);
    #else
        // If only 1 step is given, use `gl.POINTS`, no shift into past steps.
        ivec2 stepShift = ivec2(0);
        float stepPast = 0.0;
        float entry = index;
    #endif

    // Turn the 1D index into a 2D texture UV.
    // Add pixel offset to sample from the pixel's center and avoid errors.
    vec2 uv = vec2(mod(entry+0.25, dataShape.x)/dataShape.x,
        (floor(entry/dataShape.x)+0.25)/dataShape.y);

    // Can also use the `reads` logic to take the minimum possible samples here.
    // Sample the desired state values - creates the `data` array.
    tapSamplesShift(states, uv, textures, stepShift)

    // Read values.
    vec3 pos = data[readPos].posChannels;
    float life = data[readLife].lifeChannels;
    vec3 acc = data[readAcc].accChannels;

    float alive = gt(life, 0.0);
    vec2 ar = aspect(viewShape);
    vec4 vertex = vec4(vec3(pos.xy*ar, pos.z)*scale, 1.0);

    gl_Position = alive*vertex;
    gl_PointSize = alive*pointSize*clamp(1.0-(vertex.z/vertex.w), 0.1, 1.0);

    float a = pow(life/lifetime[1], 0.1);

    color = a*vec4(stepPast/float(stepsPast), entry/float(count),
        (length(acc)/(force.x*pow(10.0, force.y)*dt))*scale, a);
}
