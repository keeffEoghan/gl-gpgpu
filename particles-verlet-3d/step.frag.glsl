/**
 * The update step for a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroPass`.
 *
 * @see [getStep]{@link ../step.js#getStep}
 * @see [macroPass]{@link ../macros.js#macroPass}
 */

#ifdef GL_EXT_draw_buffers
    #extension GL_EXT_draw_buffers : require
#endif

precision highp float;

// Setting up the macros and aliases.

#define posTexture texture_0
#define lifeTexture texture_1
#define accTexture texture_2

#define posChannels channels_0
#define lifeChannels channels_1
#define accChannels channels_2

useSamples

#ifdef output_0
    #define posOutput output_0
    useReads_0
    #define posReadPos0 reads_0_i(0)
    #define posReadPos1 reads_0_i(1)
    #define posReadAcc reads_0_i(2)
    #define posReadLife reads_0_i(3)
#endif
#ifdef output_1
    #define lifeOutput output_1
    useReads_1
    #define lifeReadLifeOldest reads_1_i(0)
    #define lifeReadLife1 reads_1_i(1)
#endif
#ifdef output_2
    #define accOutput output_2
    useReads_2
    #define accReadAcc reads_2_i(0)
    #define accReadLife reads_2_i(1)
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

#pragma glslify: map = require('glsl-map');

#ifdef posOutput
    #pragma glslify: verlet = require('@epok.tech/glsl-verlet');
#endif

#if defined(lifeOutput) || defined(accOutput)
    #pragma glslify: random = require('glsl-random');
#endif

#ifdef accOutput
    const float tau = 6.28318530718;

    // @see https://observablehq.com/@rreusser/equally-distributing-points-on-a-sphere
    vec3 randomOnSphere(vec2 randoms) {
        float a = randoms[0]*tau;
        float u = (randoms[1]*2.0)-1.0;

        return vec3(sqrt(1.0-(u*u))*vec2(cos(a), sin(a)), u);
    }
#endif

#pragma glslify: le = require('glsl-conditionals/when_le');

void main() {
    // Sample textures.
    // Add pixel offset to sample from the pixel's center and avoid errors.
    vec2 st = uv+(vec2(0.25)/dataShape);

    tapSamples(states, st, textures)

    // Read values.

    #ifdef posOutput
        vec3 pos0 = data[posReadPos0].posChannels;
    #endif
    #if defined(lifeOutput) || defined(posOutput)
        vec3 pos1 = data[posReadPos1].posChannels;
    #endif

    #if defined(lifeOutput) || defined(posOutput) || defined(accOutput)
        #if defined(posOutput)
            #define readLife posReadLife
        #elif defined(lifeOutput)
            #define readLife lifeReadLife
        #elif defined(accOutput)
            #define readLife accReadLife
        #endif

        float life = data[readLife].lifeChannels;
        float spawn = le(life, 0.0);
    #endif

    #if defined(lifeOutput)
        float lifeOldest = data[lifeReadLifeOldest].lifeChannels;
    #endif

    #if defined(posOutput) || defined(accOutput)
        #if defined(posOutput)
            #define readAcc posReadAcc
        #elif defined(accOutput)
            #define readAcc accReadAcc
        #endif

        vec3 acc = data[readAcc].accChannels;
    #endif

    // Output updated values.
    #ifdef posOutput
        // Use either Euler or Verlet integration.
        vec3 pos = mix(pos1+(acc*dt), verlet(acc, pos0, pos1, dt), useVerlet);

        posOutput = mix(pos, source, spawn);
    #endif
    #ifdef lifeOutput
        life = max(0.0, life-dt);

        float lifeSpawn = map(random(uv*loop),
            0.0, 1.0, lifetime[0], lifetime[1]);

        // Only spawn life once the oldest step reaches the end of its lifetime
        // (past and current life are both 0).
        lifeOutput = mix(life, lifeSpawn, spawn*le(lifeOldest, 0.0));
    #endif
    #ifdef accOutput
        // To help accuracy of very small numbers, pass force as `[x, y] = xey`.
        float f = force.x*pow(10.0, force.y);

        acc += g*f*dt;

        vec2 randoms = vec2(random((uv+loop)/dt), random((uv-loop)*dt));
        vec3 accSpawn = randomOnSphere(randoms)*random(loop-(uv*dt))*f*5e3;

        accOutput = mix(acc, accSpawn, spawn);
    #endif
}
