/**
 * How many vertexes for pairs of line segments linking each entry's states,
 * using `gl.LINES`.
 * If fewer than 2 states are given, lines can't be drawn, assumes `gl.POINTS`.
 * Every pair of indexes is a line-segment connecting each state to its past
 * state, making one continuous line back through steps using `gl.LINES`;
 * iterating each start index and its past index.
 * Corresponds to the indexing logic in the `indexPairs` GLSL function.
 *
 * @see [readme]{@link ./readme.md}
 * @see `gl.LINES` at https://webglfundamentals.org/webgl/lessons/webgl-points-lines-triangles.html
 * @see [indexPairs]{@link ./index.glsl#indexPairs}
 *
 * @param {number} states The number of steps of state to link by pairs of line
 *     segments.
 *
 * @returns {number} The number of points needed to link all steps of state
 *     by pairs of line segments. May be multiplied with the number of entries
 *     in each step.
 */
export const indexPairs = (states) => Math.max(1, (states-1)*2);

export default indexPairs;
