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

uniform mat4 modelView;
uniform mat4 projection;
uniform vec2 aspect;
uniform float wide;
uniform float dt;
uniform float loop;
uniform vec3 lifetime;
uniform vec2 paceColor;
uniform float useVerlet;
uniform float form;
uniform vec2 hues;

uniform float fizz;
uniform float fizzMax;
uniform float fizzRate;
uniform float fizzCurve;

/** View-space position. */
varying vec4 positionView;
/** Center and radius for points or lines; only points have `gl_PointCoord`. */
varying vec3 sphere;
varying vec4 color;
varying vec3 emissive;

#pragma glslify: gt = require(glsl-conditionals/when_gt)
#pragma glslify: random = require(glsl-random)
#pragma glslify: map = require(glsl-map)
#pragma glslify: tau = require(glsl-constants/TWO_PI)
#pragma glslify: hsl2rgb = require(glsl-hsl2rgb)

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

const vec4 hide = vec4(0);

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
  float ago = stepPast/max(float(gpgpu_stepsPast-1), 1.0);

  /** Fizz randomly on a sphere around older positions. */
  float fizzBy = pow(clamp(stepPast/fizz, 0.0, 1.0), fizzCurve)*fizzMax;
  float fizzAt = loop*fizzRate*mix(-1.0, 1.0, mod(entry, 2.0))/(1.0+fizzBy);
  float fizzAngle = (random(position1.xy+entry)+fizzAt)*tau;
  // float fizzDepth = sin(random(vec2(position1.z, life)-entry)+fizzAt);
  float fizzDepth = abs((fract(random(vec2(position1.z, life)-entry)+fizzAt)*2.0)-1.0);
  vec3 fizzed = fizzBy*onSphere(fizzAngle, fizzDepth);

  positionView = modelView*vec4(position1+fizzed, 1);
  // positionView = vec4(mix(vec2(-0.5), vec2(0.5), st), 0.2, 1);

  vec4 to = mix(hide, projection*positionView, alive);

  to.xy *= aspect;

  gl_Position = to;

  float fade = clamp(pow(life/lifetime.t, 0.3), 0.0, 1.0)*
    clamp(pow(1.0-ago, 0.9), 0.0, 1.0);

  float size = wide*fade/to.w;

  gl_PointSize = size;

  /**
   * Convert vertex position to `gl_FragCoord` window-space.
   * @see [SO](https://stackoverflow.com/a/7158573)
   * @see [SO](https://stackoverflow.com/a/54237532/716898)
   * @todo Might need the viewport `x` and `y` offset as well as `w` and `h`?
   */
  sphere = vec3(gpgpu_viewShape*(((to.xy/to.w)*0.5)+0.5), size*0.5);

  float hue = fract(mix(hues.s, hues.t, entry/float(gpgpu_entries)));

  color = vec4(hsl2rgb(hue, fade, 0.7), fade);

  vec3 velocity = mix(motion, (position1-position0)/dt, useVerlet);

  emissive = hsl2rgb(hue, 1.0,
    clamp(pow(dot(velocity, velocity)*paceColor.s, paceColor.t), 0.0, 0.7));
}
