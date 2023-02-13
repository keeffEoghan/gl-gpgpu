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
/** Scale depths over near and far range, and precision (arbitrarily). */
uniform vec3 depths;
/** Fog start offset, scale, exponent, maximum effect. */
uniform vec4 fog;
/** The clear and fog color. */
uniform vec4 clear;
/** Material roughness, albedo, and skin thickness. */
uniform vec3 material;
uniform vec3 lightAmbient;

#ifndef lightPointsL
  #define lightPointsL 0
#elif lightPointsL > 0
  uniform vec3 lightPointPositions[lightPointsL];
  uniform vec3 lightPointColors[lightPointsL];
  uniform vec3 lightPointFactors[lightPointsL];
#endif

/** View-space position. */
varying vec4 positionView;
/** Center and radius for points or lines; only points have `gl_PointCoord`. */
varying vec3 sphere;
varying vec4 color;
varying vec3 emissive;

#pragma glslify: map = require(glsl-map)
#pragma glslify: lt = require(glsl-conditionals/when_lt)
#pragma glslify: gt = require(glsl-conditionals/when_gt)
#pragma glslify: diffuse = require(glsl-diffuse-oren-nayar)
#pragma glslify: specular = require(glsl-specular-beckmann)

/**
 * Point-light attenuation.
 *
 * @see [I'm Doing it Wrong - Light Attenuation](https://imdoingitwrong.wordpress.com/2011/01/31/light-attenuation/)
 *
 * @param d A vector of light position distance, [distance, distance squared].
 * @param a A vector of attenuation factors, [constant, linear, quadratic].
 *
 * @returns The attenuation of the point-light.
 */
float attenuate(vec2 d, vec3 a) { return 1.0/dot(a, vec3(1, d)); }
float attenuate(float d2, vec3 a) { return attenuate(vec2(sqrt(d2), d2), a); }

/**
 * Spherical-light attenuation.
 *
 * @see [I'm Doing it Wrong - Light Attenuation](https://imdoingitwrong.wordpress.com/2011/01/31/light-attenuation/)
 *
 * @param d A vector of light position distance, [distance, distance squared].
 * @param r A vector of spherical-light radius, [radius, radius squared].
 *
 * @returns The attenuation of the spherical-light.
 */
float attenuate(vec2 d, vec2 r) { return attenuate(d, vec3(1, vec2(2, 1)/r)); }
float attenuate(vec2 d, float r2) { return attenuate(d, vec2(sqrt(r2), r2)); }
float attenuate(float d2, vec2 r) { return attenuate(vec2(sqrt(d2), d2), r); }

float attenuate(float d2, float r2) {
  return attenuate(vec2(sqrt(d2), d2), r2);
}

void main() {
  /**
   * Distance to a sphere's surface, and resulting normal and depth.
   *
   * @see [SO](https://stackoverflow.com/a/31829666/716898)
   * @see [SO](https://stackoverflow.com/questions/53271461/drawing-a-sphere-normal-map-in-the-fragment-shader)
   * @see [Shadertoy](https://www.shadertoy.com/view/XsfXDr)
   * @see [Figure 13.2. Circle Point Computation](https://nicolbolas.github.io/oldtut/Illumination/Tutorial%2013.html)
   */
  float r = sphere.b;
  float r2 = r*r;
  vec2 cf = gl_FragCoord.xy-sphere.xy;
  float cfl2 = dot(cf, cf);
  float isWide = gt(wide, 1.0);

  // Don't round if maximum width isn't enough.
  if(isWide*cfl2 > r2) { discard; }

  /** Vector pointing from the `sphere`'s center towards the eye. */
  vec3 axis = vec3(cf, sqrt(r2-cfl2));
  vec3 normal = axis/r;
  float sphereDepth = abs(axis.z/wide);

  #ifdef GL_EXT_frag_depth
    /** The `sphere`'s fragment depth; scaled (arbitrarily) into depth space. */
    gl_FragDepthEXT = map(gl_FragCoord.z-(depths.b*sphereDepth),
      depths.s, depths.t, 0.0, 1.0);
  #endif

  vec3 lit = lightAmbient;
  vec3 pe = -positionView.xyz;
  float peL = length(pe);

  pe /= peL;

  #if lightPointsL > 0
    for(int l = 0; l < lightPointsL; ++l) {
      vec3 lightPosition = lightPointPositions[l];
      vec3 lightColor = lightPointColors[l];
      vec3 lightFactor = lightPointFactors[l];
      float rough = material.r;
      float albedo = material.g;
      vec3 pl = lightPosition-positionView.xyz;
      vec2 plL = vec2(dot(pl, pl));

      pl /= (plL.s = sqrt(plL.s));

      lit += lightColor*attenuate(plL, lightFactor)*
        (diffuse(pl, pe, normal, rough, albedo)+
          specular(pl, pe, normal, rough));
    }
  #endif

  // More transparent looking directly onto thin material, if wide enough.
  float thick = 1.0-abs(normal.z*(1.0-material.z)*isWide);
  float foggy = min(pow(max(peL-sphereDepth-fog.x, 0.0)*fog.y, fog.z), fog.w);
  vec3 shade = mix((color.rgb*lit)+emissive, clear.rgb, foggy);
  float fade = color.a*thick;

  gl_FragColor = vec4(shade*fade, fade);
}
