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

// uniform vec2 scale;
// uniform vec2 depthRange;
uniform float wide;

/** Center and radius for points or lines; only points have `gl_PointCoord`. */
varying vec4 sphere;
varying vec4 color;

#pragma glslify: map = require(glsl-map)

void main() {
  /**
   * Distance to a sphere's surface, and resulting normal and depth.
   *
   * @see [SO](https://stackoverflow.com/a/31829666/716898)
   * @see [SO](https://stackoverflow.com/questions/53271461/drawing-a-sphere-normal-map-in-the-fragment-shader)
   * @see [Shadertoy](https://www.shadertoy.com/view/XsfXDr)
   * @see [Figure 13.2. Circle Point Computation](https://nicolbolas.github.io/oldtut/Illumination/Tutorial%2013.html)
   */
  float r2 = sphere.w*sphere.w;
  vec2 cf = gl_FragCoord.xy-sphere.xy;
  float cfl2 = dot(cf, cf);

  if(cfl2 > r2) { discard; }

  float z2 = r2-cfl2;
  vec3 axis = vec3(cf, sqrt(z2));
  vec3 normal = axis/sphere.w;

  // float depth = gl_FragCoord.z-(axis.z*(scale.s*pow(10.0, scale.t)));
  // float depth = gl_FragCoord.z-
  //   map(axis.z, depthRange.s, depthRange.t, 0.0, 1.0);
  // float depth = gl_FragCoord.z-(axis.z/wide);
  float depth = gl_FragCoord.z-(axis.z/wide);

  /** @todo Attenuated point lights shading. */
  // gl_FragColor = vec4(normal, 1);
  // gl_FragColor = color;
  // gl_FragColor = vec4(color.rgb, color.a*normal.z);
  // gl_FragColor = vec4(color.rgb, color.a*exp(depth));
  gl_FragColor = vec4(color.rgb, color.a*exp(depth)*normal.z);

  #ifdef GL_EXT_frag_depth
    /** Scale the `axis` into clip space. */
    gl_FragDepthEXT = depth;
  #endif
}
