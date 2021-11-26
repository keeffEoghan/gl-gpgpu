/**
 * The update step for a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroPass`.
 * Written as several individual shaders that may be combined into one or more
 * passes; `gpgpu` preprocessor macros control the combination according to
 * which `values` are currently bound for `output` to the next `state`.
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
#define posChannels channels_0
#define accChannels channels_1
#define lifeChannels channels_2
// Set up sampling logic.
useSamples

// Set up minimal texture reads logic; only read what a value with a currently
// bound output `derives` from other `values` for its next state.
// See `derives` for indexing (`reads_${bound value index}_${derives index}`).
#ifdef output_0
    #define posOutput output_0
    useReads_0
    #define posReadPos0 reads_0_0
    #define posReadPos1 reads_0_1
    #define posReadAcc reads_0_2
    #define posReadLife reads_0_3
#endif
#ifdef output_1
    #define accOutput output_1
    useReads_1
    #define accReadAcc reads_1_0
    #define accReadLife reads_1_1
#endif
#ifdef output_2
    #define lifeOutput output_2
    useReads_2
    #define lifeReadLifeOldest reads_2_0
    #define lifeReadLife1 reads_2_1
#endif

// The main shader.

// States from `gl-gpgpu`.
uniform sampler2D states[stepsPast*textures];
uniform vec2 dataShape;
// Custom inputs for this demo.
uniform float dt;
uniform float time;
uniform float loop;
uniform vec2 lifetime;
uniform vec2 force;
uniform float useVerlet;
uniform vec3 g;
uniform vec3 source;

varying vec2 uv;

#pragma glslify: map = require(glsl-map)
#pragma glslify: le = require(glsl-conditionals/when_le)

#ifdef posOutput
    #pragma glslify: verlet = require(@epok.tech/glsl-verlet)
#endif

#ifdef accOutput
    #pragma glslify: tau = require(glsl-constants/TWO_PI)

    // @see https://observablehq.com/@rreusser/equally-distributing-points-on-a-sphere
    vec3 randomOnSphere(vec2 randoms) {
        float a = randoms[0]*tau;
        float u = (randoms[1]*2.0)-1.0;

        return vec3(sqrt(1.0-(u*u))*vec2(cos(a), sin(a)), u);
    }
#endif

#if defined(accOutput) || defined(lifeOutput)
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

    // If reads all map to the same value sample, any of them will do.
    #if defined(posOutput)
        #define readLife posReadLife
    #elif defined(lifeOutput)
        #define readLife lifeReadLife
    #elif defined(accOutput)
        #define readLife accReadLife
    #endif

    float life = data[readLife].lifeChannels;
    float spawn = le(life, 0.0);

    #ifdef posOutput
        vec3 pos0 = data[posReadPos0].posChannels;
        vec3 pos1 = data[posReadPos1].posChannels;
    #endif

    // If reads all map to the same value sample, any of them will do.
    #if defined(posOutput) || defined(accOutput)
        #if defined(posOutput)
            #define readAcc posReadAcc
        #elif defined(accOutput)
            #define readAcc accReadAcc
        #endif

        vec3 acc = data[readAcc].accChannels;
    #endif

    #ifdef lifeOutput
        float lifeOldest = data[lifeReadLifeOldest].lifeChannels;
    #endif

    // Output updated values.
    #ifdef posOutput
        // Use either Euler (approximate) or Verlet integration.
        vec3 posEuler = pos1+(acc*dt*dt);
        vec3 posVerlet = verlet(acc, pos0, pos1, dt);

        posOutput = mix(mix(posEuler, posVerlet, useVerlet), source, spawn);
    #endif
    #ifdef lifeOutput
        float lifeNew = map(random(uv*loop), 0.0, 1.0, lifetime.s, lifetime.t);

        // Only spawn life once the oldest step reaches the end of its lifetime
        // (past and current life are both 0).
        lifeOutput = mix(max(0.0, life-dt), lifeNew, spawn*le(lifeOldest, 0.0));
    #endif
    #ifdef accOutput
        // To help accuracy of very small numbers, pass force as `[S, T] = SeT`.
        float f = force.s*pow(10.0, force.t);

        acc += g*f*dt;

        vec2 randoms = vec2(random((uv+loop)/dt), random((uv-loop)*dt));
        vec3 accNew = randomOnSphere(randoms)*random(loop-(uv*dt))*f*5e3;

        accOutput = mix(acc, accNew, spawn);
    #endif
}
