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

#pragma glslify: indexPairs = require(../../index-pairs)

void main() {
    #if stepsPast < 2
        // If fewer than 2 steps are given, uses `gl.POINTS`.
        vec2 stepEntry = vec2(0.0, index);
    #else
        vec2 stepEntry = indexPairs(index, float(stepsPast));
    #endif

    // Step back a full state's worth of textures per step index.
    int stateIndex = int(stepEntry[0])*textures;

    // Turn the 1D index into a 2D texture UV.
    // Add pixel offset to sample from the pixel's center and avoid errors.
    vec2 uv = vec2(mod(stepEntry[1]+0.25, dataShape.x)/dataShape.x,
        (floor(stepEntry[1]/dataShape.x)+0.25)/dataShape.y);

    // Sample the desired state values.
    // @todo Make use of the `reads` logic to take the minimum possible samples.
    vec3 pos = texture2D(states[stateIndex+posTexture], uv).posChannels;
    float life = texture2D(states[stateIndex+lifeTexture], uv).lifeChannels;
    float l = pow(life/lifetime[1], 0.7);

    color = mix(vec4(l),
        vec4(stepEntry[0]/float(stepsPast), stepEntry[1]/float(count), 0.8,
            l/(dataShape.x*dataShape.y)),
        l);

    vec2 ar = aspect(viewShape);

    gl_Position = gt(life, 0.0)*
        vec4(vec3(pos.xy*ar, pos.z*max(ar.x, ar.y))*scale, 1);

    gl_PointSize = pointSize*l;
}
