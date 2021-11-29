/**
 * The update step for a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroPass`.
 * Executed in one or more passes; each chunk depending on a `gpgpu` macro may
 * be combined with others into one pass or separated into its own pass; `gpgpu`
 * preprocessor macros control the combination according to which `values` are
 * currently bound for `output` to the next `state`.
 *
 * @see [getStep]{@link ../../step.js#getStep}
 * @see [macroPass]{@link ../../macros.js#macroPass}
 */

#ifdef GL_EXT_draw_buffers
    #extension GL_EXT_draw_buffers : require
#endif

precision highp float;

// Setting up the macros and aliases.
// Note that these `texture_i`/`channels_i`/`reads_i_j` indexes correspond to
// the value at that index in the `values`/`derives` arrays provided to `gpgpu`;
// they are defined here to match the arrangement in `./index.js`.

// The texture channels each of the `values` is stored in.
#define positionChannels channels_0
#define motionChannels channels_1
#define lifeChannels channels_2

// Set up sampling logic.
useSamples

// Set up minimal texture reads logic; only read what a value with a currently
// bound output `derives` from other `values` for its next state.
// See `derives` for indexing `reads_${bound value index}_${derives index}`.
#ifdef output_0
    #define positionOutput output_0
    useReads_0
    #define positionReadPosition0 reads_0_0
    #define positionReadPosition1 reads_0_1
    #define positionReadMotion reads_0_2
    #define positionReadLife reads_0_3
#endif
#ifdef output_1
    #define motionOutput output_1
    useReads_1
    #define motionReadMotion reads_1_0
    #define motionReadLife reads_1_1
#endif
#ifdef output_2
    #define lifeOutput output_2
    useReads_2
    #define lifeReadLifeLast reads_2_0
    #define lifeReadLife1 reads_2_1
#endif

// The main shader.

// States from `gl-gpgpu`.
uniform sampler2D states[stepsPast*textures];
uniform vec2 dataShape;
// Custom inputs for this demo.
uniform float dt0;
uniform float dt1;
uniform float loop;
uniform vec2 lifetime;
uniform vec2 energy;
uniform float useVerlet;
uniform vec3 g;
uniform vec3 source;
uniform float spout;

varying vec2 uv;

#pragma glslify: map = require(glsl-map)
#pragma glslify: le = require(glsl-conditionals/when_le)

#ifdef positionOutput
    // @todo Try Velocity Verlet integration.
    #pragma glslify: verlet = require(@epok.tech/glsl-verlet/p-p-a)
#endif

#ifdef motionOutput
    #pragma glslify: tau = require(glsl-constants/TWO_PI)

    // @see https://observablehq.com/@rreusser/equally-distributing-points-on-a-sphere
    vec3 randomOnSphere(float randomAngle, float randomDepth) {
        float a = randomAngle*tau;
        float u = (randomDepth*2.0)-1.0;

        return vec3(sqrt(1.0-(u*u))*vec2(cos(a), sin(a)), u);
    }
#endif

#if defined(motionOutput) || defined(lifeOutput)
    #pragma glslify: random = require(glsl-random)
#endif

#pragma glslify: offsetUV = require(../../sample/offset-uv)

void main() {
    // Offset UV to sample at the texel center and avoid errors.
    // @todo Could go in vertex shader.
    vec2 st = offsetUV(uv, dataShape);

    // Sample the desired state values - creates the `data` array.
    tapSamples(states, st, textures)

    // Read values.

    #ifdef positionOutput
        vec3 position0 = data[positionReadPosition0].positionChannels;
        vec3 position1 = data[positionReadPosition1].positionChannels;
    #endif

    // If reads all map to the same value sample, any of them will do.
    #if defined(positionOutput) || defined(motionOutput)
        #if defined(positionOutput)
            #define readMotion positionReadMotion
        #elif defined(motionOutput)
            #define readMotion motionReadMotion
        #endif

        vec3 motion = data[readMotion].motionChannels;
    #endif

    // If reads all map to the same value sample, any of them will do.
    #if defined(positionOutput)
        #define readLife positionReadLife
    #elif defined(lifeOutput)
        #define readLife lifeReadLife
    #elif defined(motionOutput)
        #define readLife motionReadLife
    #endif

    float life = data[readLife].lifeChannels;

    #ifdef lifeOutput
        float lifeLast = data[lifeReadLifeLast].lifeChannels;
    #endif

    // Update and output values.

    // Whether the particle is ready to respawn.
    float spawn = le(life, 0.0);

    #if defined(positionOutput) || defined(motionOutput)
        // Workaround for switching Euler/Verlet; interpret `motion` data as
        // acceleration/velocity, respectively.
        vec3 velocity = motion;
        vec3 acceleration = motion;
    #endif

    #ifdef positionOutput
        // Use either Euler integration...
        position1 = mix(position1+(velocity*dt1),
            // ... or Verlet integration...
            verlet(position0, position1, acceleration, dt0, dt1),
            // ... according to which is currently active.
            useVerlet);

        positionOutput = mix(position1, source, spawn);
    #endif
    #ifdef motionOutput
        // Use `energy` to scale kinetic motions.
        // To help numeric accuracy, pass energy as `[x, y] = x*10**y`.
        float e = energy.s*pow(10.0, energy.t);

        // The new acceleration is just constant acceleration due to gravity.
        // @todo To make this more interesting, add e.g: drag.
        // @see https://en.wikipedia.org/wiki/Verlet_integration#Algorithmic_representation
        acceleration = g*e;
        motion = mix(velocity+(acceleration*dt1), acceleration, useVerlet);

        vec3 motionNew = e*spout*random(loop-(uv*dt0))*
            randomOnSphere(random((uv+loop)/dt1), random((uv-loop)*dt0));

        motionOutput = mix(motion, motionNew, spawn);
    #endif
    #ifdef lifeOutput
        float lifeNew = map(random(uv*loop), 0.0, 1.0, lifetime.s, lifetime.t);
        // Whether the oldest of this trail has faded.
        float faded = le(lifeLast, 0.0);

        // Only spawn life once the oldest step reaches the end of its lifetime
        // (past and current life are both 0).
        lifeOutput = mix(max(life-dt1, 0.0), lifeNew, spawn*faded);
    #endif
}
