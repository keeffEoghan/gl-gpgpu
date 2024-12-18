/**
 * The update step for a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroPass`.
 * Executed in one or more passes; each chunk depending on a `gpgpu` macro may
 * be combined with others into one pass or separated into its own pass; `gpgpu`
 * preprocessor macros control the combination according to which `values` are
 * currently bound for `output` to the next `state`.
 *
 * @see {@link step.toStep}
 * @see {@link macros.macroPass}
 */

#ifdef GL_EXT_draw_buffers
  #extension GL_EXT_draw_buffers : require
#endif

precision highp float;

// Setting up the macros and aliases `gl-gpgpu` provides.

/** Set up sampling logic via `gl-gpgpu` macro. */
gpgpu_useSamples

// Set up minimal texture reads logic; only read what a value with a currently
// bound output `derives` from other `values` for its next state.
// See `derives` for how each `reads_${value}_${derive}` is indexed
// per-`derive`-per-`value`.
#ifdef gpgpu_output_position
  gpgpu_useReads_position
#endif
#ifdef gpgpu_output_motion
  gpgpu_useReads_motion
#endif
#ifdef gpgpu_output_life
  gpgpu_useReads_life
#endif

// The main shader.

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

// Common shader inputs and parts.

uniform float dt1;
uniform float loop;

/** Default UV coordinates from default `gpgpu` vertex shader. */
varying vec2 gpgpu_uv;

#pragma glslify: random = require(glsl-random);
#pragma glslify: lt = require(glsl-conditionals/when_lt);
#pragma glslify: le = require(glsl-conditionals/when_le);

// Any shader inputs or parts can also be split up by usage in different passes.

#ifdef gpgpu_output_position
  uniform float moveCap;
  uniform vec2 pace;
  uniform vec3 source;

  /** @todo Try Velocity Verlet integration. */
  #pragma glslify: verlet = require(@epok.tech/glsl-verlet/p-p-a);
#endif

#ifdef gpgpu_output_motion
  uniform float epsilon;
  /** Sink position, and universal gravitational constant. */
  uniform vec4 sink;
  /** Constant acceleration of gravity; and whether to use it or the `sink`. */
  uniform vec4 g;
#endif

#ifdef gpgpu_output_life
  /** A particle's lifetime range, and whether it's allowed to respawn. */
  uniform vec3 lifetime;

  #pragma glslify: map = require(glsl-map);
#endif

#if defined(gpgpu_output_position) || defined(gpgpu_output_motion)
  uniform float dt0;
  uniform float useVerlet;
  uniform vec2 spout;

  #pragma glslify: tau = require(glsl-constants/TAU);
  #pragma glslify: onSphere = require(./on-sphere);
#endif

float canSpawn(float life) {
  // Whether to prefill initial states before spawning, or start with all `0`.
  #ifdef prefill
    return lt(life, 0.0);
  #else
    return le(life, 0.0);
  #endif
}

void main() {
  /** Sample the desired state values - creates the `gpgpu_data` `array`. */
  gpgpu_tapState(gpgpu_uv);

  // Read values.

  // If reads all map to the same value sample, any of them will do.
  #if defined(gpgpu_output_position) || defined(gpgpu_output_motion)
    #if defined(gpgpu_output_position)
      #define readMotion gpgpu_reads_position_motion
      #define readPosition1 gpgpu_reads_position_position_new_0
    #elif defined(gpgpu_output_motion)
      #define readMotion gpgpu_reads_motion_motion
      #define readPosition1 gpgpu_reads_motion_position
    #endif

    vec3 position1 = gpgpu_data[readPosition1].gpgpu_channels_position;
    vec3 motion = gpgpu_data[readMotion].gpgpu_channels_motion;
  #endif

  #ifdef gpgpu_output_position
    #if gpgpu_stepsPast > 1
      vec3 position0 = gpgpu_data[gpgpu_reads_position_position_new_1]
        .gpgpu_channels_position;
    #else
      vec3 position0 = position1;
    #endif
  #endif

  // If reads all map to the same value sample, any of them will do.
  #if defined(gpgpu_output_position)
    #define readLife gpgpu_reads_position_life
  #elif defined(gpgpu_output_life)
    #define readLife gpgpu_reads_life_life_new
  #elif defined(gpgpu_output_motion)
    #define readLife gpgpu_reads_motion_life
  #endif

  vec2 life = gpgpu_data[readLife].gpgpu_channels_life;

  #ifdef gpgpu_output_life
    vec2 lifeLast = gpgpu_data[gpgpu_reads_life_life_old].gpgpu_channels_life;
  #endif

  // Update and output values.
  // Note that the update/output logic components within each `#if` macro
  // block from `gpgpu` are independent modules, as the `gpgpu` macros
  // determine whether they're executed across one or more passes - they could
  // also be coded in separate files called from here, however they're coded
  // inline here for brevity, relevance, and easy access to shared variables.

  /** Whether the particle is ready to respawn. */
  float spawn = canSpawn(life.x);

  #if defined(gpgpu_output_position) || defined(gpgpu_output_motion)
    // Workaround for switching Euler/Verlet; interpret `motion` data as
    // acceleration/velocity, respectively.
    vec3 velocity = motion;
    vec3 acceleration = motion;

    /** Spawn randomly on a sphere around the source, move in that direction. */
    vec3 spoutSpawn = random((-gpgpu_uv.st*(0.6+loop))/(0.1+dt0))*
      onSphere(random((gpgpu_uv.st*(0.3+loop))/(0.9+dt0))*tau,
        mix(-1.0, 1.0, random((-gpgpu_uv.ts*(0.2+loop))/(0.8+dt1))));
  #endif

  #ifdef gpgpu_output_position
    /** For numeric accuracy, encoded as exponent `[b, p] => b*(10**p)`. */
    float speed = pace.s*pow(10.0, pace.t);

    /**
     * Constrain Verlet movement; handle here for better numerical accuracy.
     * Any position changes below the movement cap remain the same; any
     * bigger clamped towards current position, by the ratio over the limit.
     */
    vec3 back = mix(position0, position1,
      clamp((distance(position1, position0)/moveCap)-1.0, 0.0, 1.0));

    // Use either Euler integration...
    vec3 positionTo = mix(position1+(velocity*dt1*speed),
      // ... or Verlet integration...
      verlet(back, position1, acceleration*speed, dt0, dt1),
      // ... according to which is currently active.
      useVerlet);

    /** Spawn around the source. */
    vec3 positionSpawn = source+(spout.x*spoutSpawn);

    /** Output the next position value to its channels in the state texture. */
    gpgpu_output_position = mix(positionTo, positionSpawn, spawn);
  #endif
  #ifdef gpgpu_output_motion
    /**
     * Gravitate towards the sink point (simplified).
     * @see [Wikipedia on gravitation](https://en.wikipedia.org/wiki/Newton%27s_law_of_universal_gravitation)
     */
    vec3 pull = sink.xyz-position1;
    float pullL2 = dot(pull, pull);

    pull *= sink.w/max(pullL2*sqrt(pullL2), epsilon);

    /** Use sink point, or constant acceleration due to gravity. */
    acceleration = mix(pull, g.xyz, g.w);

    vec3 motionTo = mix(velocity+(acceleration*dt1), acceleration, useVerlet);
    vec3 motionNew = spout.y*spoutSpawn;

    /** Output the next motion value to its channels in the state texture. */
    gpgpu_output_motion = mix(motionTo, motionNew, spawn);
  #endif
  #ifdef gpgpu_output_life
    vec2 lifeTo = vec2(life.x-dt1, life.y);

    vec2 lifeNew = vec2(map(random(gpgpu_uv*(1.0+loop)),
      0.0, 1.0, lifetime.s, lifetime.t));

    /** Whether the oldest state has faded. */
    float faded = canSpawn(lifeLast.x);

    /**
     * Output the next life value to its channels in the state texture.
     * Only spawn life once the oldest step reaches the end of its lifetime
     * (past and current life are both 0), and if it's allowed to respawn.
     */
    gpgpu_output_life = mix(lifeTo, lifeNew, spawn*faded*lifetime.z);
  #endif
}
