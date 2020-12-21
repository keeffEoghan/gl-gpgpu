/**
 * The step and entry indexes corrseponding to how many vertexes for pairs of
 * line segments to link each entry's states, as detailed in the `indexPairs` JS
 * function.
 *
 * @see [readme]{@link ./readme.md}
 * @see [indexPairs]{@link ./index.js#indexPairs}
 *
 * @param {float|int} index The index of a vertex (assumes simple sequential
 *     index attribute).
 * @param {float|int} states How many steps of state each entry has.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *     correct data to draw a line along each entry's steps of state.
 */
vec2 indexPairs(float index, float states) {
    float i = index/2.0;
    float s = states-1.0;
    float d = floor(i/s);

    // Equivalent, but can avoid recalculating part of modulo, reusing `d`.
    // @see https://www.shaderific.com/glsl-functions#modulo
    // float m = mod(i, s);
    float m = i-(s*d);

    return vec2(ceil(m), d);
}

ivec2 indexPairs(int index, int states) {
    return ivec2(indexPairs(float(index), float(states)));
}

#pragma glslify: export(indexPairs);
