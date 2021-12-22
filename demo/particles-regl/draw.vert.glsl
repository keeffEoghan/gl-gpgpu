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

// States from `gl-gpgpu`; in separate textures or merged.
#ifdef mergedStates
    uniform sampler2D states;
#else
    uniform sampler2D states[stepsPast*textures];
#endif

uniform float stepNow;
uniform vec4 dataShape;
uniform vec2 viewShape;
uniform float pointSize;
uniform float dt;
uniform vec2 lifetime;
uniform vec2 pace;
uniform float useVerlet;
uniform float form;

varying vec4 color;

#pragma glslify: aspect = require(@epok.tech/glsl-aspect/contain)
#pragma glslify: gt = require(glsl-conditionals/when_gt)

#pragma glslify: indexUV = require(../../sample/index-uv)
#pragma glslify: offsetUV = require(../../sample/offset-uv)

#if stepsPast > 1
    // If multiple steps are given, shift into past steps.
    // These lookups are equivalent, input and result's  iteration order differ.
    #define indexFormsStates
    #ifdef indexFormsStates
        #pragma glslify: indexStates = require(../../index-forms/index-states)
    #else
        #pragma glslify: indexEntries = require(../../index-forms/index-entries)
    #endif
#endif

#ifdef testGPGPU
    const float testPosition = 1.0;
    const float testMotion = 2.0;
    const float testLife = 3.0;
#endif

void main() {
    #if stepsPast > 1
        // If multiple steps are given, find past step and entry.
        #ifdef indexFormsStates
            vec2 stepEntry = indexStates(index, stepsPast, form);
        #else
            vec2 stepEntry = indexEntries(index, count, form);
        #endif

        float stepPast = stepEntry.s;
        float entry = stepEntry.t;
    #else
        // If only 1 step is given, past step and entry are known.
        float stepPast = 0.0;
        float entry = index;
    #endif

    // Turn the 1D index into a 2D texture UV; offset to sample at the texel
    // center and avoid errors.
    // vec2 st = indexUV(entry, dataShape.xy);
    vec2 st = offsetUV(indexUV(entry, dataShape.xy), dataShape.xy);
    // vec2 st = offsetUV(fract(indexUV(entry, dataShape.xy)), dataShape.xy);
    // @todo Why does this seem to work? Texture/memory layout of `subimage`?
    // vec2 st = offsetUV(indexUV(entry, dataShape.zw), dataShape.zw);

    // Can also use the `reads` logic to take the minimum possible samples here.
    // Sample the desired state values - creates the `data` array.
    #if stepsPast > 1
        // Shift into past steps.
        tapStateBy(st, stepPast, 0)
    #else
        // No past steps, no shift.
        tapState(st)
    #endif

    // Read values.
    vec3 position0 = (data[readPosition0].positionChannels);
    vec3 position1 = (data[readPosition1].positionChannels);
    vec3 motion = (data[readMotion].motionChannels);
    float life = (data[readLife].lifeChannels);

    #ifdef testGPGPU
        position0 -= testPosition;
        position1 -= testPosition;
        motion -= testMotion;
        life -= testLife;

        // st = vec2(mod(entry, dataShape.x), floor(entry/dataShape.x))/max(dataShape.xy-1.0, 1.0);
        // st = floor(vec2(mod(entry, dataShape.x), mod(entry/dataShape.x, dataShape.y)))/max(dataShape.xy-1.0, 1.0);
        // st = indexUV(entry, dataShape.xy);
        // st = indexUV(entry, dataShape.zw);
        // st = offsetUV(st, dataShape.xy);
        // st = offsetUV(st, dataShape.zw);(
        gl_Position = vec4(((((st+(vec2(stepPast)*vec2(0.2, 1.2)))/vec2(1, stepsPast))*2.0)-1.0)*0.1, 0, 1);
        // gl_Position = vec4(1, 1, 0, 1);
        gl_PointSize = 10.0;
        // color = vec4(1);
        // color = vec4(0, 0, 0, 0.5);
        color = vec4(1, 1, 1, 0.5);
        // color.r = fract(position1.x);
        // color.g = fract(motion.x);
        color.g = entry/float(count-1);
        // color.g = index/float((count*textures*stepsPast)-1);
        // color.b = fract(life);
        // color.b = stepPast/max(float(stepsPast-1), 1.0);

        return;
    #endif

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
    // gl_PointSize = alive*pointSize*depth*mix(0.1, 1.0, ratioNow);
    gl_PointSize = alive*pointSize*mix(0.8, 1.0, ratioNow);

    // float a = pow(life/lifetime.t, 0.3)*pow(ratioNow, 0.3);
    // float speed = length(mix(motion, position1-position0, useVerlet)/dt);

    // color = a*vec4(mix(0.2, 1.0, ratioNow), mix(0.2, 1.0, entry/float(count)),
    //     clamp(pow(speed*pace.s, pace.t), 0.0, 1.0), a);

    vec3 c0 = vec3(1, 0, 0);
    vec3 c1 = vec3(0, 0, 1);
    // color = vec4(mix(c0, c1, ratioNow), 1.0);
    // color = vec4(mix(c0, c1, a), 1.0);
    // color = vec4(mix(c0, c1, clamp(pow(speed*pace.s, pace.t), 0.0, 1.0)), 1.0);
    // @todo The entry (and possibly step) seems to be incorrect for merge.
    color = vec4(mix(c0, c1, mix(0.2, 1.0, entry/float(count))), 1.0);
}
