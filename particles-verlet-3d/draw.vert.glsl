/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../macros.js#macroPass}
 * @see [macroValues]{@link ../macros.js#macroValues}
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

varying vec4 color;

#pragma glslify: gt = require('glsl-conditionals/when_gt');

#pragma glslify: linesPairs = require('./lines-pairs');

void main() {
    #if stepsPast < 2
        // If fewer than 2 steps are given, uses `gl.POINTS`.
        vec2 stepEntry = (0.0, index);
    #else
        vec2 stepEntry = linesPairs(index, float(stepsPast));
    #endif

    // Step back a full state's worth of textures per step index.
    int stateIndex = int(stepEntry[0])*textures;

    // Turn the 1D index into a 2D texture UV - adding a half-pixel offset to
    // ensure sampling from the pixel's center and avoid errors.
    vec2 uv = vec2(mod(stepEntry[1]+0.5, dataShape.x)/dataShape.x,
        (floor(stepEntry[1]/dataShape.x)+0.5)/dataShape.y);

    // Sample the desired state values.
    // @todo Make use of the `reads` logic to take the minimum possible samples.
    vec3 pos = texture2D(states[stateIndex+posTexture], uv).posChannels;
    float life = texture2D(states[stateIndex+lifeTexture], uv).lifeChannels;
    float l = pow(life/lifetime[1], 0.2);

    // color = l*
    color = 1.0*
        vec4(stepEntry[0]/float(stepsPast), stepEntry[1]/float(count), 0.4, 1);

    gl_Position = vec4(pos/max(viewShape.x, viewShape.y), 1)*gt(life, 0.0);
    gl_PointSize = pointSize*l;
}
