/**
 * @param {float} angle An angle, in radians, expects range `[0, 2*pi]`.
 * @param {float} depth A depth, expects range `[-1, 1]`.
 *
 * @see [Spherical distribution](https://observablehq.com/@rreusser/equally-distributing-points-on-a-sphere)
 */
vec3 onSphere(float angle, float depth) {
  return vec3(sqrt(1.0-(depth*depth))*vec2(cos(angle), sin(angle)), depth);
}

#pragma glslify: export(onSphere)
