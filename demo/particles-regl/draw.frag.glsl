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

/** Center and radius for points or lines; only points have `gl_PointCoord`. */
varying vec4 sphere;
varying vec4 color;

void main() {
  /**
   * Distance to a sphere's surface, and resulting normal and depth.
   *
   * @see [SO](https://stackoverflow.com/a/31829666/716898)
   * @see [SO](https://stackoverflow.com/questions/53271461/drawing-a-sphere-normal-map-in-the-fragment-shader)
   * @see [Shadertoy](https://www.shadertoy.com/view/XsfXDr)
   */
  vec2 cf = gl_FragCoord.xy-sphere.xy;
  float cfl2 = dot(cf, cf);
  float r2 = sphere.w*sphere.w;

  if(cfl2 > r2) { discard; }

  float z2 = r2-cfl2;
  vec3 axis = vec3(cf, sqrt(z2));
  vec3 normal = normalize(axis);

  // float d2 = cfl2/r2;
  // float d = sqrt(cfl2)/sqrt(r2);
  // vec4 c = vec4(color.rgb, mix(color.a, 0.0, clamp(d2, 0.0, 1.0)));
  // vec4 c = vec4(color.rgb, mix(color.a, 0.0, clamp(d, 0.0, 1.0)));

  /** @todo Attenuated point lights shading. */
  // gl_FragColor = c*c.a;
  gl_FragColor = color*color.a;
  // gl_FragColor = vec4(normal, 1);

  #ifdef GL_EXT_frag_depth
    // gl_FragDepthEXT = gl_FragCoord.z-axis.z;
    gl_FragDepthEXT = gl_FragCoord.z-(normal.z*sphere.w);

    // gl_FragDepthEXT = sphere.z;
    // gl_FragDepthEXT = sphere.z-z2;
    // gl_FragDepthEXT = sphere.z-axis.z;
    // gl_FragDepthEXT = sphere.z+(axis.z*sphere.w);
    // gl_FragDepthEXT = sphere.z+(normal.z*sphere.w);
    // gl_FragDepthEXT = sphere.z-(normal*sphere.w).z;
    // gl_FragDepthEXT = normal.z*sphere.w;

    // float d2 = cfl2/r2;
    // float d = sqrt(cfl2)/sqrt(r2);

    // gl_FragDepthEXT = sphere.z+d2;
    // gl_FragDepthEXT = sphere.z+d;
    // gl_FragDepthEXT = sphere.z+(d*d);
  #endif
}
