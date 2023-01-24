/** @see [Spherical distribution](https://observablehq.com/@rreusser/equally-distributing-points-on-a-sphere) */
#pragma glslify: tau = require(glsl-constants/TWO_PI)

vec3 onSphere(float angle, float depth) {
  float a = angle*tau;
  float u = (depth*2.0)-1.0;

  return vec3(sqrt(1.0-(u*u))*vec2(cos(a), sin(a)), u);
}

#pragma glslify: export(onSphere)
