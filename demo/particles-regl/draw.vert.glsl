/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see {@link macros.macroPass}
 * @see {@link macros.macroValues}
 */

precision highp float;

// The texture channels each of the `values` is stored in.
#define positionChannels gpgpu_channels_0
#define motionChannels gpgpu_channels_1
#define lifeChannels gpgpu_channels_2
// Set up sampling logic.
gpgpu_useSamples
// Only the first value derives from all values, giving these minimal `reads`.
gpgpu_useReads_0
// These first `derives` are all in one pass, `0`, in the order of `values`.
// See `values` for indexing `reads_0_${derives index == values index}`.
#define readPosition1 gpgpu_reads_0_0
#define readMotion gpgpu_reads_0_1
#define readLife gpgpu_reads_0_2
// Additional `derives` are individually specified.
#define readPosition0 gpgpu_reads_0_3

attribute float index;

// States from `gl-gpgpu`; in separate textures or merged.
#ifdef gpgpu_mergedStates
  uniform sampler2D gpgpu_states;
#else
  uniform sampler2D gpgpu_states[gpgpu_stepsPast*gpgpu_textures];
#endif

/** Current step from `gl-gpgpu`; needed for `tapStates` or `tapStatesBy`. */
uniform float gpgpu_stepNow;
/** Further `gl-gpgpu` uniforms. */
uniform vec4 gpgpu_stateShape;
uniform vec2 gpgpu_viewShape;

uniform float pointSize;
uniform float dt;
uniform vec3 lifetime;
uniform vec2 pace;
uniform float useVerlet;
uniform float form;
uniform float loop;
uniform float shake;

varying vec4 color;
varying vec3 center;
varying float radius;

#pragma glslify: aspect = require(@epok.tech/glsl-aspect/contain)
#pragma glslify: gt = require(glsl-conditionals/when_gt)
#pragma glslify: random = require(glsl-random)

#pragma glslify: onSphere = require(./on-sphere)
#pragma glslify: indexUV = require(../../src/lookup/index-uv)
#pragma glslify: offsetUV = require(../../src/lookup/offset-uv)

#if gpgpu_stepsPast > 1
  // If multiple steps are given, shift into past steps.
  // Lookups mostly equivalent; input and result iteration order differ.
  #define indexFormsStates
  #ifdef indexFormsStates
    #pragma glslify: indexStates = require(../../src/index-forms/index-states)
  #else
    #pragma glslify: indexEntries = require(../../src/index-forms/index-entries)
  #endif
#endif

const vec4 noPosition = vec4(0, 0, -1, 0);

void main() {
  #if gpgpu_stepsPast > 1
    // If multiple steps are given, find past step and entry.
    // Lookups mostly equivalent; input and result iteration order differ.
    #ifdef indexFormsStates
      vec2 stepEntry = indexStates(index, gpgpu_stepsPast, form);
    #else
      vec2 stepEntry = indexEntries(index, gpgpu_entries, form);
    #endif

    float stepPast = stepEntry.s;
    float entry = stepEntry.t;
  #else
    // If only 1 step is given, past step and entry are known.
    float stepPast = 0.0;
    float entry = index;
  #endif

  // Turn 1D index into 2D texture UV; offset to texel center, avoids errors.
  vec2 st = offsetUV(indexUV(entry, gpgpu_stateShape.xy), gpgpu_stateShape.xy);

  // Can also use the `reads` logic to take the minimum possible samples here.
  // Sample the desired state values; creates the `gpgpu_data` `array`.
  #if gpgpu_stepsPast > 1
    // Shift into past steps.
    gpgpu_tapStateBy(st, stepPast, 0)
  #else
    // No past steps, no shift.
    gpgpu_tapState(st)
  #endif

  // Read values.
  vec3 position0 = gpgpu_data[readPosition0].positionChannels;
  vec3 position1 = gpgpu_data[readPosition1].positionChannels;
  vec3 motion = gpgpu_data[readMotion].motionChannels;
  float life = gpgpu_data[readLife].lifeChannels;
  float alive = gt(life, 0.0);

  vec2 ago = vec2(stepPast/max(float(gpgpu_stepsPast-1), 1.0),
    max(stepPast-1.0, 0.0)/max(float(gpgpu_stepsPast-2), 1.0));

  vec2 ar = aspect(gpgpu_viewShape);

  /** Shake randomly on a sphere around older positions. */
  vec3 position = vec3(position1.xy*ar, position1.z)+
    (shake*pow(ago.y, 2.0)*onSphere(random(position1.xy), fract(position1.z)));

  /** @todo Perspective camera transform. */
  vec4 vertex = mix(noPosition, vec4(position, 1), alive);
  float depth = clamp(1.0-(vertex.z/vertex.w), 0.1, 1.0);
  float alpha = clamp(pow(life/lifetime.t, 0.3)*pow(1.0-ago.x, 0.3), 0.0, 1.0);
  float size = pointSize*depth*alpha;

  gl_Position = vertex;
  gl_PointSize = size;

  radius = size*0.5;

  /**
   * Convert vertex position to `gl_FragCoord` window-space.
   * @see [SO](https://stackoverflow.com/a/7158573)
   * @todo Might need the viewport `x` and `y` offset as well as `w` and `h`?
   */
  center = vec3(gpgpu_viewShape*((1.0+vertex.xy)/vertex.w)*0.5, vertex.z);

  float speed = length(mix(motion, position1-position0, useVerlet)/dt);

  color = alpha*vec4(mix(1.0, 0.2, ago.x),
    mix(0.2, 1.0, entry/float(gpgpu_entries)),
    clamp(pow(speed*pace.s, pace.t), 0.0, 1.0),
    alpha);
}
