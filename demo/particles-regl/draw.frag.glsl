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

uniform float wide;
uniform vec2 depthRange;

/** Center and radius for points or lines; only points have `gl_PointCoord`. */
varying vec4 sphere;
varying vec4 color;

#pragma glslify: map = require(glsl-map)
#pragma glslify: le = require(glsl-conditionals/when_le)

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

  /** Scale the `axis` into clip space. */
  float depth = clamp(map(gl_FragCoord.z-(axis.z/wide),
      depthRange.s, depthRange.t, 0.0, 1.0),
    0.0, 1.0);

  /** @todo Attenuated point lights shading. */
  // vec4 blend = vec4(normal, 1);
  // vec4 blend = color;
  // vec4 blend = vec4(color.rgb, color.a*normal.z);
  // vec4 blend = vec4(color.rgb*mix(0.2, 1.0, depth), color.a);
  vec4 blend = vec4(color.rgb*mix(0.2, 1.0, depth), color.a*normal.z);

  // Blend less if the maximum width is 1 pixel.
  gl_FragColor = mix(blend, color, le(wide, 1.0)*0.7);

  #ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = depth;
  #endif
}
