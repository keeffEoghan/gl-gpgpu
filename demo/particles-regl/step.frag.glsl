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

// Note that these `texture_i`/`channels_i`/`reads_i_j` indexes correspond to a
// value at that index in the `values`/`derives` arrays provided to `gl-gpgpu`;
// they are defined here to match that arrangement.

// The texture channels each of the `values` is stored in.
#define positionChannels gpgpu_channels_0
#define motionChannels gpgpu_channels_1
#define lifeChannels gpgpu_channels_2

/** Set up sampling logic via `gl-gpgpu` macro. */
gpgpu_useSamples

// Set up minimal texture reads logic; only read what a value with a currently
// bound output `derives` from other `values` for its next state.
// See `derives` for indexing `reads_${bound value index}_${derives index}`.
#ifdef gpgpu_output_0
  #define positionOutput gpgpu_output_0
  gpgpu_useReads_0
  #define positionReadPosition0 gpgpu_reads_0_0
  #define positionReadPosition1 gpgpu_reads_0_1
  #define positionReadMotion gpgpu_reads_0_2
  #define positionReadLife gpgpu_reads_0_3
#endif
#ifdef gpgpu_output_1
  #define motionOutput gpgpu_output_1
  gpgpu_useReads_1
  #define motionReadMotion gpgpu_reads_1_0
  #define motionReadLife gpgpu_reads_1_1
  #define motionReadPosition gpgpu_reads_1_2
#endif
#ifdef gpgpu_output_2
  #define lifeOutput gpgpu_output_2
  gpgpu_useReads_2
  #define lifeReadLifeLast gpgpu_reads_2_0
  #define lifeReadLife1 gpgpu_reads_2_1
#endif

// The main shader.

// States from `gl-gpgpu`; in separate textures or merged.
#ifdef gpgpu_mergedStates
  uniform sampler2D gpgpu_states;
#else
  uniform sampler2D gpgpu_states[gpgpu_stepsPast*gpgpu_textures];
#endif

/** Current step from `gl-gpgpu`; needed for `tapStates` or `tapStatesBy`. */
uniform float gpgpu_stepNow;

// Common shader inputs and parts.

uniform float dt1;
uniform float loop;

varying vec2 uv;

#pragma glslify: random = require(glsl-random)
#pragma glslify: lt = require(glsl-conditionals/when_lt)
#pragma glslify: le = require(glsl-conditionals/when_le)

float canSpawn(float life) {
  // Whether to prefill initial states before spawning, or start with all `0`.
  #ifdef prefill
    return lt(life, 0.0);
  #else
    return le(life, 0.0);
  #endif
}

// Any shader inputs or parts can also be split up by usage in different passes.

#ifdef positionOutput
  uniform float moveCap;
  uniform vec2 scale;
  uniform vec3 source;

  /** @todo Try Velocity Verlet integration. */
  #pragma glslify: verlet = require(@epok.tech/glsl-verlet/p-p-a)
#endif

#ifdef motionOutput
  uniform float epsilon;
  /** Sink position, and universal gravitational constant. */
  uniform vec4 sink;
  /** Constant acceleration of gravity; and whether to use it or the `sink`. */
  uniform vec4 g;
#endif

#ifdef lifeOutput
  /** A particle's lifetime range, and whether it's allowed to respawn. */
  uniform vec3 lifetime;

  #pragma glslify: map = require(glsl-map)
#endif

#if defined(positionOutput) || defined(motionOutput)
  uniform float dt0;
  uniform float useVerlet;
  uniform vec2 spout;

  #pragma glslify: tau = require(glsl-constants/TWO_PI)
  #pragma glslify: onSphere = require(./on-sphere)
#endif

void main() {
  // Sample the desired state values - creates the `gpgpu_data` `array`.
  gpgpu_tapState(uv)

  // Read values.

  #ifdef positionOutput
    vec3 position0 = gpgpu_data[positionReadPosition0].positionChannels;
  #endif

  // If reads all map to the same value sample, any of them will do.
  #if defined(positionOutput) || defined(motionOutput)
    #if defined(positionOutput)
      #define readMotion positionReadMotion
      #define readPosition positionReadPosition1
    #elif defined(motionOutput)
      #define readMotion motionReadMotion
      #define readPosition motionReadPosition
    #endif

    vec3 position1 = gpgpu_data[readPosition].positionChannels;
    vec3 motion = gpgpu_data[readMotion].motionChannels;
  #endif

  // If reads all map to the same value sample, any of them will do.
  #if defined(positionOutput)
    #define readLife positionReadLife
  #elif defined(lifeOutput)
    #define readLife lifeReadLife
  #elif defined(motionOutput)
    #define readLife motionReadLife
  #endif

  float life = gpgpu_data[readLife].lifeChannels;

  #ifdef lifeOutput
    float lifeLast = gpgpu_data[lifeReadLifeLast].lifeChannels;
  #endif

  // Update and output values.
  // Note that the update/output logic components within each `#if` macro
  // block from `gpgpu` are independent modules, as the `gpgpu` macros
  // determine whether they're executed across one or more passes - they could
  // also be coded in separate files called from here, however they're coded
  // inline here for brevity, relevance, and easy access to shared variables.

  /** Whether the particle is ready to respawn. */
  float spawn = canSpawn(life);

  #if defined(positionOutput) || defined(motionOutput)
    // Workaround for switching Euler/Verlet; interpret `motion` data as
    // acceleration/velocity, respectively.
    vec3 velocity = motion;
    vec3 acceleration = motion;

    /** Spawn randomly on a sphere around the source, move in that direction. */
    vec3 spoutSpawn = random(loop-(uv*(1.0+dt0)))*
      onSphere(random((uv+loop)/(1.0-dt1))*tau,
        mix(-1.0, 1.0, random((uv-loop)*(1.0+dt1))));
  #endif

  #ifdef positionOutput
    /** For numeric accuracy, encoded as exponent `[b, p] => b*(10**p)`. */
    float size = scale.s*pow(10.0, scale.t);

    /**
     * Constrain Verlet movement; handle here for better numerical accuracy.
     * Any position changes below the movement cap remain the same; any
     * bigger clamped towards current position, by the ratio over the limit.
     */
    vec3 back = mix(position0, position1,
      clamp((distance(position1, position0)/moveCap)-1.0, 0.0, 1.0));

    // Use either Euler integration...
    vec3 positionTo = mix(position1+(velocity*dt1*size),
      // ... or Verlet integration...
      verlet(back, position1, acceleration*size, dt0, dt1),
      // ... according to which is currently active.
      useVerlet);

    /** Spawn around the source. */
    vec3 positionSpawn = source+(spout.x*spoutSpawn);

    /** Output the next position value to its channels in the state texture. */
    positionOutput = mix(positionTo, positionSpawn, spawn);
  #endif
  #ifdef motionOutput
    /**
     * Gravitate towards the sink point (simplified).
     * @see [Wikipedia on gravitation](https://en.wikipedia.org/wiki/Newton%27s_law_of_universal_gravitation)
     */
    vec3 gravity = sink.xyz-position1;

    gravity *= sink.w/max(dot(gravity, gravity), epsilon);

    /** Use sink point, or constant acceleration due to gravity. */
    acceleration = mix(gravity, g.xyz, g.w);

    vec3 motionTo = mix(velocity+(acceleration*dt1), acceleration, useVerlet);
    vec3 motionNew = spout.y*spoutSpawn;

    /** Output the next motion value to its channels in the state texture. */
    motionOutput = mix(motionTo, motionNew, spawn);
  #endif
  #ifdef lifeOutput
    float lifeTo = life-dt1;
    float lifeNew = map(random(uv*loop), 0.0, 1.0, lifetime.s, lifetime.t);
    /** Whether the oldest state has faded. */
    float faded = canSpawn(lifeLast);

    /**
     * Output the next life value to its channels in the state texture.
     * Only spawn life once the oldest step reaches the end of its lifetime
     * (past and current life are both 0), and if it's allowed to respawn.
     */
    lifeOutput = mix(lifeTo, lifeNew, spawn*faded*lifetime.z);
  #endif
}
