/**
 * The step and entry indexes corrseponding to the vertex count for pairs of
 * elements (e.g: lines linking each entry's states); as detailed in the
 * `indexPairs` JS function.
 * Computed with `modDiv`.
 *
 * @see [readme]{@link ./readme.md}
 * @see [indexPairs]{@link ./index.js#indexPairs}
 * @see [modDiv]{@link ../util/mod-div.glsl}
 *
 * @param {float|int} `index` The index of a vertex (assumes simple sequential
 *     index attribute).
 * @param {float|int} `states` How many steps of state each entry has.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *     correct data to draw a line along each entry's steps of state; always a
 *     `vec2` if any operand is a `float`.
 */

#pragma glslify: modDiv = require(../util/mod-div)

vec2 indexPairs(float index, float states) {
    vec2 stepEntry = modDiv(index/2.0, states-1.0);

    stepEntry.s = ceil(stepEntry.s);

    return stepEntry;
}

ivec2 indexPairs(int index, int states) {
    // Careful handling integer maths - values truncated.
    ivec2 stepEntry = modDiv(index, (states-1)*2);

    stepEntry.s = (stepEntry.s+1)/2;

    return stepEntry;
}

vec2 indexPairs(float index, int states) {
    vec2 stepEntry = modDiv(index/2.0, states-1);

    stepEntry.s = ceil(stepEntry.s);

    return stepEntry;
}

vec2 indexPairs(int index, float states) {
    // Careful handling integer maths - values truncated.
    vec2 stepEntry = modDiv(index, (states-1.0)*2.0);

    stepEntry.s = ceil(stepEntry.s/2.0);

    return stepEntry;
}

#pragma glslify: export(indexPairs);
