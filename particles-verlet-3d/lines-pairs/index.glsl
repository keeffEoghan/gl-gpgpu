/**
 * The step and entry indexes corrseponding to how many vertexes for pairs of
 * line segments to link each entry's states, as detailed in the `linesPairs` JS
 * function.
 *
 * @see [linesPairs]{@link ./index.js#linesPairs}
 *
 * @param {float|int} index The index of a vertex (assumes simple sequential
 *     index attribute).
 * @param {float|int} states How many steps of state each entry has.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *     correct data to draw a line along each entry's steps of state.
 */
vec2 linesPairs(float index, float states) {
    return vec2(ceil(mod(index, states)), floor(index/states));
}

ivec2 linesPairs(int index, int states) {
    return ivec2(linesPairs(float(index), float(states)));
}

#pragma glslify: export(linesPairs);
