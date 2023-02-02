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
uniform vec3 depths;
uniform vec3 fog;

/** Center and radius for points or lines; only points have `gl_PointCoord`. */
varying vec3 sphere;
varying vec4 color;

/** Normals at the near and far depth planes, respectively. */
const vec3 normal0 = vec3(0, 0, -1);
const vec3 normal1 = vec3(0, 0, 1);

#pragma glslify: map = require(glsl-map)
#pragma glslify: lt = require(glsl-conditionals/when_lt)
#pragma glslify: gt = require(glsl-conditionals/when_gt)

void main() {
  /**
   * Distance to a sphere's surface, and resulting normal and depth.
   *
   * @see [SO](https://stackoverflow.com/a/31829666/716898)
   * @see [SO](https://stackoverflow.com/questions/53271461/drawing-a-sphere-normal-map-in-the-fragment-shader)
   * @see [Shadertoy](https://www.shadertoy.com/view/XsfXDr)
   * @see [Figure 13.2. Circle Point Computation](https://nicolbolas.github.io/oldtut/Illumination/Tutorial%2013.html)
   */
  float r = sphere.z;
  float r2 = r*r;
  vec2 cf = gl_FragCoord.xy-sphere.xy;
  float cfl2 = dot(cf, cf);
  float thick = gt(wide, 1.0);

  // Don't round if maximum width isn't thick enough.
  if(thick*cfl2 > r2) { discard; }

  float z2 = r2-cfl2;
  /** Vector pointing from the `sphere`'s center towards the eye. */
  vec3 axis = vec3(cf, -sqrt(z2));
  vec3 normal = axis/r;
  // vec3 normal = normalize(axis);

  /** The `sphere`'s fragment depth; scale `axis.z` to depth to clip space. */
  float depth = map(gl_FragCoord.z+((axis.z/wide)*depths.b),
    depths.s, depths.t, 0.0, 1.0);

  /** Normal is flat if the sphere is clipped beyond the depth range. */
  normal = mix(mix(normal, normal0, lt(depth, 0.0)), normal1, gt(depth, 1.0));
  depth = clamp(depth, 0.0, 1.0);

  #ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = depth;
  #endif

  /** @todo Attenuated point lights shading. */
  vec4 shade = color;

  // shade = vec4(map(normal, vec3(-1), vec3(1), vec3(0), vec3(1)), 1);
  // shade = vec4(-normal.zzz, 1);

  shade.rgb = mix(shade.rgb, vec3(fog.s),
    clamp(pow(depth, fog.p)-fog.t, 0.0, 1.0));

  shade.a *= mix(1.0, -normal.z, mix(0.0, 0.8, thick));

  shade.rgb *= shade.a;
  gl_FragColor = shade;
}
