/**
 * How many vertexes for a given form to cover each entry's steps of state:
 * - If 2 states or form are given, gives a setup of pairs for a line segment
 *   between each entry's steps of state using `gl.LINES`.
 * - If fewer than 2 states or form are given, gives a setup for a point at each
 *   entry's steps of state using `gl.POINTS`.
 *
 * Possibly useful for other forms too.
 *
 * Corresponds to the indexing logic in the `indexForms` `GLSL` function.
 *
 * @module
 * @category JS
 *
 * @see {@link index-forms/index-states.glsl!}
 * @see {@link index-forms/index-entries.glsl!}
 * @see [`gl.LINES`](https://webglfundamentals.org/webgl/lessons/webgl-points-lines-triangles.html)
 *
 * @param {number} [states=1] How many steps of state each entry has.
 * @param {number} [form=2] How many steps of state each form covers.
 * @param {number} [count=1] How many entries, if any; result to be multiplied
 *   externally if not given.
 *
 * @returns {number} The number of vertexes needed for the given `form` to cover
 *   all steps of `states`; over all `count` if given, to be multiplied
 *   externally if not given.
 *
 * @remarks [[include:src/index-forms/readme.md]]
 */
export const indexForms = (states = 1, form = 2, count = 1) =>
  Math.max(1, (states-form)+1)*form*count;

export default indexForms;
