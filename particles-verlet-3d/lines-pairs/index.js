/**
 * How many vertexes for pairs of line segments linking each entry's states,
 * using `gl.LINES`.
 * If fewer than 2 states are given, lines can't be drawn, assumes `gl.POINTS`.
 * Every pair of indexes is a line-segment connecting each state to its past
 * state, making one continuous line back through steps using `gl.LINES`;
 * iterating each start index and its past index.
 * Corresponds to the indexing logic in the `linesPairs` GLSL function.
 *
 * @see `gl.LINES` at https://webglfundamentals.org/webgl/lessons/webgl-points-lines-triangles.html
 * @see [linesPairs]{@link ./index.glsl#linesPairs}
 *
 * @example
 *     // 2 entries, 3 steps, 8 indexes:
 *     [0, 1, 2, 3, 4, 5, 6, 7]
 *     // 2 lines, 2 segments each:
 *     [[[0, 1], [1, 2]], [[0, 1], [1, 2]]]
 *     // 2 lines of entry indexes:
 *     [[[0, 0], [0, 0]], [[1, 1], [1, 1]]]
 * @example
 *     // 2 entries, 4 steps, 12 indexes:
 *     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
 *     // 2 lines, 3 segments each:
 *     [[[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [2, 3]]]
 *     // 2 lines of entry indexes:
 *     [[[0, 0], [0, 0], [0, 0]], [[1, 1], [1, 1], [1, 1]]]
 * @example
 *     // 3 entries, 3 steps, 12 indexes:
 *     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
 *     // 3 lines, 2 segments each:
 *     [[[0, 1], [1, 2]], [[0, 1], [1, 2]], [[0, 1], [1, 2]]]
 *     // 3 lines of entry indexes:
 *     [[[0, 0], [0, 0]], [[1, 1], [1, 1]], [[2, 2], [2, 2]]]
 * @example
 *     // 1 entry, 2 steps, 2 indexes:
 *     [0, 1]
 *     // 1 line, 1 segment:
 *     [[[0, 1]]]
 *     // 2 lines of entry indexes:
 *     [[[0, 0]]]
 *
 * @param {number} states The number of steps of state to link by pairs of line
 *     segments.
 *
 * @returns {number} The number of points needed to link all steps of state
 *     by pairs of line segments. May be multiplied with the number of entries
 *     in each step.
 */
export const linesPairs = (states) => Math.max(1, (states-1)*2);

export default linesPairs;
