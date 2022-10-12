/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see {@link macros.macroPass}
 * @see {@link macros.macroValues}
 */

#ifdef GL_EXT_frag_depth
  #extension GL_EXT_frag_depth : enable
#endif

precision highp float;

varying vec4 color;
varying vec3 center;
varying float radius;

void main() {
  // Fade out to transparent when the fragment is beyond the radius.
  vec2 vc = center.xy-gl_FragCoord.xy;
  float vcl2 = dot(vc, vc);
  float r2 = radius*radius;

  if(vcl2 > r2) { discard; }

  float d2 = vcl2/r2;

  gl_FragColor = vec4(color.rgb, mix(color.a, 0.0, d2));

  #ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = center.z+d2;
  #endif
}
