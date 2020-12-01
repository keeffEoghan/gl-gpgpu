/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../macros.js#macroPass}
 * @see [macroValues]{@link ../macros.js#macroValues}
 */

precision highp float;

varying vec3 color;

void main() { gl_FragColor = vec4(color, 1); }
