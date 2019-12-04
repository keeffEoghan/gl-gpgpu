/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros - see `macroGPGPUDraw`.
 *
 * @see [getGPGPUDraw]{@link ../draw.js#getGPGPUDraw}
 * @see [macroGPGPUDraw]{@link ../macros.js#macroGPGPUDraw}
 */

precision highp float;

varying float stepIndex;
varying float life;

const vec3 colorAlive = vec3(0.2, 0.2, 1.0);
const vec3 colorDead = vec3(1.0, 0.2, 0.2);

void main() {
    vec3 color = mix(colorDead, colorAlive, life);

    // gl_FragColor = vec4(color, stepIndex/float(GPGPUStepsPast-1));
    gl_FragColor = vec4(color, 1.0);
    // gl_FragColor = vec4(color, 0.5);
}
