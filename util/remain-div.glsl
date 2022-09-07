/**
 * Equivalent to a _remainder_ operator; same as `mod` for same-signed operands,
 * but different for differently-signed operands, like JavaScript's `%`
 * operator.
 * Reuses the truncated division, and returns both; as both are useful in
 * various places, e.g: index conversion.
 *
 * @see https://www.shaderific.com/glsl-functions#modulo
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 *
 * @param {float|int} `x` The first remainder/divide operand, expect `x >= 0`.
 * @param {float|int} `y` The second remainder/divide operand, expect `y >= 0`.
 *
 * @returns {vec2|ivec2} The result as `[(remainder), (truncated division)]`;
 *   always a `vec2` if any operand is a `float`.
 */

ivec2 remainDiv(int x, int y) {
  // Careful handling integer maths; decimals truncated, works like a
  // _remainder_ operator, rather than `mod`.
  int d = x/y;

  return ivec2(x-(y*d), d);
}

vec2 remainDiv(float x, int y) {
  int d = int(x)/y;

  // Remainder; like `mod` but with truncated `d` not floored, reuses `d`.
  // @see https://www.shaderific.com/glsl-functions#modulo
  // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
  // return vec2(mod(x, y), d);
  return vec2(x-float(y*d), d);
}

/**
 * Assume higher accuracy is desired; if less computation with `int` is desired,
 * use `remainDiv(int(x), int(y))` or `vec2(remainDiv(int(x), int(y)))` instead.
 */
vec2 remainDiv(float x, float y) { return remainDiv(x, int(y)); }

/**
 * Assume higher accuracy is desired; if less computation with `int` is desired,
 * use `remainDiv(x, int(y))` or `vec2(remainDiv(x, int(y)))` instead.
 */
vec2 remainDiv(int x, float y) { return remainDiv(float(x), y); }

#pragma glslify: export(remainDiv);
