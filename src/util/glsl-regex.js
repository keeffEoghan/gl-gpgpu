/**
 * Gives a `RegExp` pattern matching the start of a `GLSL` variable name, to match
 * prefix namespacing in `GLSL` source.
 *
 * @example ```
 * glslString.replaceAll(new RegExp(preGLSLRx('gpgpu_'), 'g'), `custom_`);
 * ```
 *
 * @param {string} pre The prefix to match the start of a `GLSL` variable name.
 *
 * @returns {string} A `RegExp` pattern that can be passed to `new RegExp()` to
 *   match the start of a `GLSL` variable name.
 */
export const preGLSLRx = (pre) => `(?<![a-zA-Z0-9_])${pre}(?=[a-zA-Z0-9_])`;
