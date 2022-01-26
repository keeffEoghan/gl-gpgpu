/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see [macroPass]{@link ../../macros.js#macroPass}
 * @see [macroValues]{@link ../../macros.js#macroValues}
 */

precision highp float;

varying vec4 color;
varying vec2 center;
varying float radius;

void main() {
    // Fade out to transparent when the fragment is beyond the radius.
    vec2 vc = center.xy-gl_FragCoord.xy;
    float vcl2 = dot(vc, vc);
    float r2 = radius*radius;

    if(vcl2 > r2) { discard; }
    else { gl_FragColor = vec4(color.rgb, mix(color.a, 0.0, vcl2/r2)); }
}
