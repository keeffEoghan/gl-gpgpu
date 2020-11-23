/**
 * The update step for a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroPass`.
 *
 * @see [getStep]{@link ../step.js#getStep}
 * @see [macroPass]{@link ../macros.js#macroPass}
 */

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
    #define posReadPos1 reads_0_i(0)
    #define posReadPos0 reads_0_i(1)
    #define posReadAcc reads_0_i(2)
    #define posReadLife reads_0_i(3)
#endif
#ifdef output_1
    #define lifeOutput output_1
    useReads_1
    #define lifeReadLife reads_1_i(0)
#endif
#ifdef output_2
    #define accOutput output_2
    useReads_2
    #define accReadAcc reads_2_i(0)
    #define accReadLife reads_2_i(1)
#endif

#ifdef GL_EXT_draw_buffers
    #extension GL_EXT_draw_buffers : require
#endif

// The main shader.

uniform sampler2D states[stepsPast*textures];
uniform float dt;
uniform float time;
uniform vec2 lifetime;

varying vec2 uv;

const vec3 g = vec3(0, -0.00098, 0);
const vec3 posSpawn = vec3(0);
const vec3 accSpawn = vec3(0.5, 0.5, 0);
const vec4 ndcRange = vec4(-1, -1, 1, 1);
const vec4 stRange = vec4(0, 0, 1, 1);

#pragma glslify: map = require('glsl-map');

#ifdef posOutput
    #pragma glslify: verlet = require('@epok.tech/glsl-verlet');
#endif

#ifdef lifeOutput
    #pragma glslify: random = require('glsl-random');
#endif

void main() {
    // Sample textures.
    vec4 data[samples_l];
    tapSamples(states, uv, textures, data)

    // Read values.
    #ifdef posOutput
        vec3 pos0 = data[posReadPos0].posChannels;
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
    #endif

    #if defined(posOutput) || defined(accOutput)
        #if defined(posOutput)
            #define readAcc posReadAcc
        #elif defined(accOutput)
            #define readAcc accReadAcc
        #endif

        vec3 acc = data[readAcc].accChannels;
    #endif

    // Update values.
    #if defined(lifeOutput) || defined(posOutput) || defined(accOutput)
        // life = max(0.0, life-dt);
        life = life-dt;
        // life = life-(dt*0.001);
        // float alive = 1.0-step(life, 0.0);
        // float alive = ((life > 0.0)? 1.0 : 0.0);
        float alive = float(life > 0.0);
    #endif
    #ifdef lifeOutput
        // float spawnedLife = min(lifetime[0], lifetime[1])+
        //     abs((lifetime[0]-lifetime[1])*random(uv*time));

        // life = mix(spawnedLife, life, alive);
        life = mix(map(random(uv*time), 0.0, 1.0, lifetime[0], lifetime[1]),
            life, alive);
    #endif
    #ifdef posOutput
        vec3 pos = mix(posSpawn, verlet(acc, pos0, pos1, dt), alive);
    #endif
    #ifdef accOutput
        vec3 accSpawned = accSpawn+vec3(vec2(sin(time), cos(time))*1.0, 0);

        acc = mix(accSpawned, acc+(g*dt), alive);
    #endif

    // Output values.
    #ifdef posOutput
        posOutput = pos;
        // posOutput = vec3(1, 0, 0);
        // posOutput = vec3(uv, 0);
    #endif
    #ifdef lifeOutput
        lifeOutput = life;
    #endif
    #ifdef accOutput
        accOutput = acc;
        // accOutput = vec3(0, 1, 0);
    #endif

    // gl_FragData[0] = vec4(1, 0, 0, 1);
    // gl_FragData[1] = vec4(0, 1, 0, 1);
    // gl_FragData[0] = vec4(uv, 0, 1);
    // gl_FragData[0].rgb = vec3(uv, 0);
    // gl_FragData[0].a = gl_FragData[1].a = 1.0;
}
