/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../../macros.js#macroPass}
 * @see [macroValues]{@link ../../macros.js#macroValues}
 */

#define posTexture texture_0
#define lifeTexture texture_1
#define accTexture texture_2

#define posChannels channels_0
#define lifeChannels channels_1
#define accChannels channels_2

precision highp float;

attribute float index;

uniform sampler2D states[stepsPast*textures];
uniform vec2 dataShape;
uniform vec2 viewShape;
uniform float pointSize;
uniform vec2 lifetime;
uniform float scale;

varying vec4 color;

#pragma glslify: aspect = require(@epok.tech/glsl-aspect/contain)
#pragma glslify: gt = require(glsl-conditionals/when_gt)

#if stepsPast > 1
    #pragma glslify: indexPairs = require(../../index-pairs)
#endif

void main() {
    #if stepsPast > 1
        vec2 stepEntry = indexPairs(index, float(stepsPast));
    #else
        // If only 1 step is given, uses `gl.POINTS`.
        vec2 stepEntry = vec2(0.0, index);
    #endif

    // Step back a full state's worth of textures per step index.
    int stateIndex = int(stepEntry[0])*textures;

    // Turn the 1D index into a 2D texture UV.
    // Add pixel offset to sample from the pixel's center and avoid errors.
    vec2 uv = vec2(mod(stepEntry[1]+0.25, dataShape.x)/dataShape.x,
        (floor(stepEntry[1]/dataShape.x)+0.25)/dataShape.y);

    // Sample the desired state values.
    // @todo Make use of the `reads` logic to take the minimum possible samples.
    float life = texture2D(states[stateIndex+lifeTexture], uv).lifeChannels;
    float alive = gt(life, 0.0);
    vec3 pos = texture2D(states[stateIndex+posTexture], uv).posChannels;
    vec2 ar = aspect(viewShape);
    vec4 vertex = vec4(vec3(pos.xy*ar, pos.z)*scale, 1.0);

    gl_Position = alive*vertex;
    gl_PointSize = alive*pointSize*clamp(1.0-(vertex.z/vertex.w), 0.1, 1.0);

    float a = pow(life/lifetime[1], 0.1);

    color = a*
        vec4(stepEntry[0]/float(stepsPast), stepEntry[1]/float(count), 0.8, a);
}
