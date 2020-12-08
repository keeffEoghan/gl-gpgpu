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
    #define lifeReadLife0 reads_1_i(0)
    #define lifeReadLife1 reads_1_i(1)
#endif
#ifdef output_2
    #define accOutput output_2
    useReads_2
    #define accReadAcc reads_2_i(0)
    #define accReadLife reads_2_i(1)
#endif

// The main shader.

uniform sampler2D states[stepsPast*textures];
uniform float dt;
uniform float time;
uniform vec2 lifetime;
uniform float force;
uniform float useVerlet;

varying vec2 uv;

const vec3 g = vec3(0, -0.00098, 0);
const vec3 posSpawn = vec3(0);
const vec4 ndcRange = vec4(-1, -1, 1, 1);
const vec4 stRange = vec4(0, 0, 1, 1);

#pragma glslify: map = require('glsl-map');

#ifdef posOutput
    #pragma glslify: verlet = require('@epok.tech/glsl-verlet');
#endif

#ifdef lifeOutput
    #pragma glslify: random = require('glsl-random');
#endif

#pragma glslify: eq = require('glsl-conditionals/when_eq');
#pragma glslify: le = require('glsl-conditionals/when_le');

void main() {
    // Sample textures.
    tapSamples(states, uv, textures)

    // Read values.
    #ifdef posOutput
        vec3 pos0 = data[posReadPos0].posChannels;
        vec3 pos1 = data[posReadPos1].posChannels;
    #endif

    #if defined(lifeOutput) || defined(posOutput) || defined(accOutput)
        #if defined(posOutput)
            #define readLife posReadLife
        #elif defined(lifeOutput)
            #define readLife lifeReadLife1
        #elif defined(accOutput)
            #define readLife accReadLife
        #endif

        float life = data[readLife].lifeChannels;
        float spawn = le(life, 0.0);
    #endif

    #if defined(lifeOutput)
        float life0 = data[lifeReadLife0].lifeChannels;
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
        vec3 pos = mix(pos1+(acc*dt*force), verlet(acc, pos0, pos1, dt),
            useVerlet);

        posOutput = mix(pos, posSpawn, spawn);
    #endif
    #ifdef lifeOutput
        // Only spawn life once the oldest step reaches the end of its lifetime.
        // (Past and current life are both 0)
        float spawnLife = le(life0, 0.0);

        lifeOutput = mix(max(0.0, life-dt),
            map(random(uv*time), 0.0, 1.0, lifetime[0], lifetime[1]),
            spawnLife*eq(spawn, spawnLife));
    #endif
    #ifdef accOutput
        float r = random(uv*time);

        accOutput = mix(acc+(g*dt*force),
            vec3(vec2(cos(time+r), -sin(time+r)), tan(time+r))*random(uv-time)*
                force,
            spawn);
    #endif
}
