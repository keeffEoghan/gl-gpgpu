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

uniform sampler2D states[steps*textures];
uniform vec2 dataShape;
uniform float pointSize;
uniform vec2 lifetime;

varying vec4 color;

void main() {
    #if steps < 2
        /**
         * If fewer than 2 states are given, uses `gl.POINTS`.
         *
         * @example
         *     1 entry, 1 step, 1 index:
         *     [0]
         *     1 point:
         *     [0]
         *     1 point of entry indexes:
         *     [0]
         * @example
         *     2 entries, 1 step, 2 indexes:
         *     [0, 1]
         *     2 points:
         *     [0, 0]
         *     2 points of entry indexes:
         *     [0, 1]
         */
        float stepIndex = 0.0;
        float entryIndex = index;
    #else
        /**
         * Every pair of indexes is a line-segment connecting each state to its past
         * state, making one continuous line back through steps using `gl.LINES`;
         * iterating each start index and its past index.
         *
         * @example
         *     2 entries, 3 steps, 8 indexes:
         *     [0, 1, 2, 3, 4, 5, 6, 7]
         *     2 lines, 2 segments each:
         *     [[[0, 1], [1, 2]], [[0, 1], [1, 2]]]
         *     2 lines of entry indexes:
         *     [[[0, 0], [0, 0]], [[1, 1], [1, 1]]]
         * @example
         *     2 entries, 4 steps, 12 indexes:
         *     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
         *     2 lines, 3 segments each:
         *     [[[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [2, 3]]]
         *     2 lines of entry indexes:
         *     [[[0, 0], [0, 0], [0, 0]], [[1, 1], [1, 1], [1, 1]]]
         * @example
         *     3 entries, 3 steps, 12 indexes:
         *     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
         *     3 lines, 2 segments each:
         *     [[[0, 1], [1, 2]], [[0, 1], [1, 2]], [[0, 1], [1, 2]]]
         *     3 lines of entry indexes:
         *     [[[0, 0], [0, 0]], [[1, 1], [1, 1]], [[2, 2], [2, 2]]]
         * @example
         *     1 entry, 2 steps, 2 indexes:
         *     [0, 1]
         *     1 line, 1 segment:
         *     [[[0, 1]]]
         *     2 lines of entry indexes:
         *     [[[0, 0]]]
         *
         * @see `gl.LINES` at https://webglfundamentals.org/webgl/lessons/webgl-points-lines-triangles.html
         */
        float stepIndex = ceil(mod(index*0.5, float(steps-1)));
        float entryIndex = floor(index/float(steps-1));
    #endif

    // Turn the 1D index into a 2D texture UV - adding a half-pixel offset to
    // ensure sampling from the pixel's center and avoid errors.
    vec2 uv = vec2(mod(entryIndex+0.5, dataShape.x)/dataShape.x,
        (floor(entryIndex/dataShape.x)+0.5)/dataShape.y);

    // Step back a full state's worth of textures per step index.
    int stateIndex = int(stepIndex)*textures;

    // Sample the desired state values.
    // @todo Make use of the `reads` logic to take the minimum possible samples.

    vec3 pos = texture2D(states[stateIndex+posTexture], uv).posChannels;
    float life = texture2D(states[stateIndex+lifeTexture], uv).lifeChannels;

    color = vec4(stepIndex/float(steps), entryIndex/float(count), life, life);

    gl_Position = vec4(pos, 1.0);
    gl_PointSize = pointSize*(life/lifetime[1]);
}
