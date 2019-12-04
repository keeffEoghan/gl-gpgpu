/**
 * The update step for a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroGPGPUStepPass`.
 *
 * @see [getGPGPUStep]{@link ../step.js#getGPGPUStep}
 * @see [macroGPGPUStepPass]{@link ../macros.js#macroGPGPUStepPass}
 */

#define texturePos GPGPUTexture_0
#define textureLife GPGPUTexture_1
#define textureAcc GPGPUTexture_2

#define channelsPos GPGPUChannels_0
#define channelsLife GPGPUChannels_1
#define channelsAcc GPGPUChannels_2

#ifdef GPGPUOutput_0
    #define outputPos GPGPUOutput_0
    GPGPUUseReads_0
    #define readsPosPos1 GPGPUReads_0_0
    #define readsPosPos0 GPGPUReads_0_1
    #define readsPosAcc1 GPGPUReads_0_2
    #define readsPosLife1 GPGPUReads_0_3
#endif
#ifdef GPGPUOutput_1
    #define outputLife GPGPUOutput_1
    GPGPUUseReads_1
    #define readsLifeLife1 GPGPUReads_1_0
#endif
#ifdef GPGPUOutput_2
    #define outputAcc GPGPUOutput_2
    GPGPUUseReads_2
    #define readsAccAcc1 GPGPUReads_2_0
    #define readsAccLife1 GPGPUReads_2_1
#endif

GPGPUUseSamples
#define samples GPGPUSamples

#ifdef GL_EXT_draw_buffers
    #extension GL_EXT_draw_buffers : require
#endif

precision highp float;

uniform sampler2D states[GPGPUStepsPast*GPGPUTextures];
uniform float dt;
uniform float stepTime;
uniform vec2 lifetime;

varying vec2 uv;

const vec3 g = vec3(0, -0.00098, 0);
const vec3 spawnPos = vec3(0);
const vec3 spawnAcc = vec3(0.5, 0.5, 0);
const vec4 ndcRange = vec4(-1, -1, 1, 1);
const vec4 stRange = vec4(0, 0, 1, 1);

#pragma glslify: map = require('glsl-map');

#ifdef outputPos
    #pragma glslify: verlet = require('../../physics/verlet');
#endif

#ifdef outputLife
    #pragma glslify: random = require('glsl-random');
#endif

void main() {
    // Sample textures.

    vec2 st = map(uv, ndcRange.xy, ndcRange.zw, stRange.xy, stRange.zw);

    GPGPUTapSamples(sampled, states, st)
    // GPGPUTapSamples(sampled, states, uv)

    // Get values.

    #ifdef outputPos
        vec3 pos0 = sampled[readsPosPos0].channelsPos;
        vec3 pos1 = sampled[readsPosPos1].channelsPos;
    #endif

    #if defined(outputLife) || defined(outputPos) || defined(outputAcc)
        #if defined(outputPos)
            #define readSampleLife readsPosLife1
        #elif defined(outputLife)
            #define readSampleLife readsLifeLife1
        #elif defined(outputAcc)
            #define readSampleLife readsAccLife1
        #endif

        float life1 = sampled[readSampleLife].channelsLife;
    #endif

    #if defined(outputPos) || defined(outputAcc)
        #if defined(outputPos)
            #define readSampleAcc readsPosAcc1
        #elif defined(outputAcc)
            #define readSampleAcc readsAccAcc1
        #endif

        vec3 acc1 = sampled[readSampleAcc].channelsAcc;
    #endif

    // Update values.

    #if defined(outputLife) || defined(outputPos) || defined(outputAcc)
        // float life = max(0.0, life1-dt);
        // float life = life1-dt;
        float life = life1-(dt*0.001);
        // float alive = 1.0-step(life, 0.0);
        float alive = ((life > 0.0)? 1.0 : 0.0);
    #endif
    #ifdef outputLife
        float spawnedLife = min(lifetime[0], lifetime[1])+
            abs((lifetime[0]-lifetime[1])*random(st*stepTime));

        life = mix(spawnedLife, life, alive);
    #endif
    #ifdef outputPos
        vec3 pos = mix(spawnPos, verlet(acc1, pos0, pos1, dt), alive);
    #endif
    #ifdef outputAcc
        vec3 spawnedAcc = spawnAcc+
            vec3(vec2(sin(stepTime), cos(stepTime))*1.0, 0);

        vec3 acc = mix(spawnedAcc, acc1+(g*dt), alive);
    #endif

    // Output values.

    #ifdef outputPos
        // outputPos = pos;
        // outputPos = vec3(1, 0, 0);
        outputPos = vec3(uv, 0);
    #endif
    #ifdef outputLife
        outputLife = life;
        outputPos.r = life;
        // outputPos.r = alive;
    #endif
    #ifdef outputAcc
        // outputAcc = acc;
        // outputAcc = vec3(0, 1, 0);
        outputAcc = vec3(0, st);
    #endif

    // gl_FragData[0] = vec4(1, 0, 0, 1);
    // gl_FragData[1] = vec4(0, 1, 0, 1);
    // gl_FragData[0] = vec4(uv, 0, 1);
    // gl_FragData[1] = vec4(0, st, 1);
    // gl_FragData[0].rgb = vec3(uv, 0);
    // gl_FragData[1].rgb = vec3(0, st);
    // gl_FragData[0].a = gl_FragData[1].a = 1.0;
}
