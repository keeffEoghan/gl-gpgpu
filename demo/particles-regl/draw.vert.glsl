/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see {@link macros.macroPass}
 * @see {@link macros.macroValues}
 */

precision highp float;

// Set up sampling logic.
gpgpu_useSamples
// Only the first value derives from all values, giving minimal `reads`.
// See `derives` for how each `reads_position_${derive}` is indexed.
gpgpu_useReads_position

attribute float index;

/** States from `gl-gpgpu`, merged or separate. */
#ifdef gpgpu_splits
  /** States from `gl-gpgpu` in separate `texture`/s. */
  uniform sampler2D gpgpu_states[gpgpu_splits];
#else
  /** States from `gl-gpgpu` in one merged `texture`. */
  uniform sampler2D gpgpu_states;
#endif

/** Current step from `gl-gpgpu`; needed for `tapStates` or `tapStatesBy`. */
uniform float gpgpu_stepNow;
/** Further `gl-gpgpu` uniforms. */
uniform vec4 gpgpu_stateShape;
uniform vec2 gpgpu_viewShape;

uniform mat4 modelView;
uniform mat4 projection;
uniform vec2 aspect;
uniform vec2 widths;
uniform float wide;
uniform float dt;
uniform float loop;
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
#pragma glslify: tau = require(glsl-constants/TAU)
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

const vec4 hide = vec4(0, 0, 0, -1);

float triangleWave(float x) { return (abs(fract(x)-0.5)*4.0)-1.0; }

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

  // Read the values.

  vec3 position1 = gpgpu_data[gpgpu_reads_position_position_new_0]
    .gpgpu_channels_position;

  #if gpgpu_stepsPast > 1
    vec3 position0 = gpgpu_data[gpgpu_reads_position_position_new_1]
      .gpgpu_channels_position;
  #else
    vec3 position0 = position1;
  #endif

  vec3 motion = gpgpu_data[gpgpu_reads_position_motion].gpgpu_channels_motion;
  vec2 life = gpgpu_data[gpgpu_reads_position_life].gpgpu_channels_life;

  // Work with the values.

  float alive = gt(life.x, 0.0);
  float ago = stepPast/max(float(gpgpu_stepsPast-1), 1.0);

  /** Fizz randomly on a sphere around older positions. */
  float fl = pow(clamp(stepPast/fizz, 0.0, 1.0), fizzCurve)*fizzMax;
  float ft = loop*fizzRate*mix(-1.0, 1.0, mod(entry, 2.0))/(1.0+fl);
  float fa = (random(position1.xy+entry)+ft)*tau;
  float fd = triangleWave(random(vec2(position1.z, life.x)-entry)+ft);

  positionView = modelView*vec4(position1+(fl*onSphere(fa, fd)), 1);
  // positionView = vec4(mix(vec2(-0.5), vec2(0.5), st), 0.2, 1);

  vec4 to = mix(hide, projection*positionView, alive);

  to.xy *= aspect;
  gl_Position = to;

  float fade = clamp(pow(1.0-ago, 0.9), 0.0, 1.0)*
    clamp(pow(life.x/life.y, 0.5), 0.0, 1.0);

  float scale = clamp(pow(1.0-(life.x/life.y), 0.4), 0.0, 1.0);

  float size = gl_PointSize = alive*0.5*
    clamp((wide*fade*scale)/to.w, widths.s, widths.t);

  /**
   * Convert vertex position to `gl_FragCoord` window-space.
   * @see [SO](https://stackoverflow.com/a/7158573)
   * @see [SO](https://stackoverflow.com/a/54237532/716898)
   */
  sphere = vec3(gpgpu_viewShape*(((to.xy/to.w)*0.5)+0.5), size*0.5);

  float hue = fract(mix(hues.s, hues.t, entry/float(gpgpu_entries)));
  vec3 velocity = mix(motion, (position1-position0)/dt, useVerlet);

  color = vec4(hsl2rgb(hue, mix(1.0, 0.1, ago), 0.7), fade);

  emissive = hsl2rgb(hue, 1.0,
    clamp(pow(dot(velocity, velocity)*paceColor.s, paceColor.t), 0.0, 0.8));
}
