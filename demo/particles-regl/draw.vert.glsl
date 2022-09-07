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

// Must be defined when using the default `tapStates` or `tapStatesBy`.
uniform float stepNow;

uniform vec4 dataShape;
uniform vec2 viewShape;
uniform float pointSize;
uniform float dt;
uniform vec3 lifetime;
uniform vec2 pace;
uniform float useVerlet;
uniform float form;

varying vec4 color;
varying vec3 center;
varying float radius;

#pragma glslify: aspect = require(@epok.tech/glsl-aspect/contain)
#pragma glslify: gt = require(glsl-conditionals/when_gt)

#pragma glslify: indexUV = require(../../lookup/index-uv)
#pragma glslify: offsetUV = require(../../lookup/offset-uv)

#if stepsPast > 1
  // If multiple steps are given, shift into past steps.
  // Lookups mostly equivalent; input and result iteration order differ.
  #define indexFormsStates
  #ifdef indexFormsStates
    #pragma glslify: indexStates = require(../../index-forms/index-states)
  #else
    #pragma glslify: indexEntries = require(../../index-forms/index-entries)
  #endif
#endif

const vec4 noPosition = vec4(0, 0, -1, 0);

void main() {
  #if stepsPast > 1
    // If multiple steps are given, find past step and entry.
    // Lookups mostly equivalent; input and result iteration order differ.
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

  // Turn 1D index into 2D texture UV; offset to texel center, avoids errors.
  vec2 st = offsetUV(indexUV(entry, dataShape.xy), dataShape.xy);

  // Can also use the `reads` logic to take the minimum possible samples here.
  // Sample the desired state values; creates the `data` array.
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

  #if stepsPast > 1
    float ratioNow = 1.0-(stepPast/float(stepsPast-1));
  #else
    float ratioNow = 1.0;
  #endif

  float alive = gt(life, 0.0);
  vec2 ar = aspect(viewShape);
  vec4 vertex = mix(noPosition, vec4(position1.xy*ar, position1.z, 1), alive);
  float depth = clamp(1.0-(vertex.z/vertex.w), 0.1, 1.0);
  float a = clamp(pow(life/lifetime.t, 0.3)*pow(ratioNow, 0.3), 0.0, 1.0);
  float size = pointSize*depth*a;

  gl_Position = vertex;
  gl_PointSize = size;

  radius = size*0.5;

  /**
   * Convert vertex position to `gl_FragCoord` window-space.
   * @see https://stackoverflow.com/a/7158573
   * @todo Might need the viewport `x` and `y` offset as well as `w` and `h`?
   */
  center = vec3(viewShape*((1.0+vertex.xy)/vertex.w)*0.5, vertex.z);

  float speed = length(mix(motion, position1-position0, useVerlet)/dt);

  color = a*vec4(mix(0.2, 1.0, ratioNow), mix(0.2, 1.0, entry/float(count)),
    clamp(pow(speed*pace.s, pace.t), 0.0, 1.0), a);
}
