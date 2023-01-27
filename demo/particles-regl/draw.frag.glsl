/**
 * Drawing a GPGPU particle simulation.
 * Requires setup with preprocessor macros. See `macroPass` and `macroValues`.
 *
 * @see {@link macros.macroPass}
 * @see {@link macros.macroValues}
 *
 * @todo Simple light shading.
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

  /** @todo Ensure this is a correct distance to the sphere's surface. */
  // float d2 = vcl2/r2;
  // float d = sqrt(vcl2)/sqrt(r2);
  // vec4 c = vec4(color.rgb, mix(color.a, 0.0, clamp(d2, 0.0, 1.0)));
  // vec4 c = vec4(color.rgb, mix(color.a, 0.0, clamp(d, 0.0, 1.0)));

  /** @todo Attenuated point lights shading. */
  // gl_FragColor = c*c.a;
  gl_FragColor = color*color.a;

  #ifdef GL_EXT_frag_depth
    float d2 = vcl2/r2;
    // float d = sqrt(vcl2)/sqrt(r2);

    gl_FragDepthEXT = center.z+d2;
    // gl_FragDepthEXT = center.z+d;
  #endif
}
