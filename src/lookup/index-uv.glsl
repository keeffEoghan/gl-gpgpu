/**
 * Convenience to turn a 1D entry index into a 2D texture `UV` for sampling.
 * Note that this does not wrap the y-axis, so if the `index` exceeds the range
 * `[0, (size.x*size.y)-1]`, the result y-axis will exceed the range `[0, 1]`.
 *
 * @see {@link util/remain-div.glsl!}
 *
 * @param {float|int} `index` 1D index, expect range `[0, (size.x*size.y)-1]`.
 * @param {float|int|vec2|ivec2} `size` Texture's size, expect
 *   `[width, height]`, or if given a scalar interpret both as `side`.
 *
 * @returns {vec2} 2D `UV` texture sample coordinate, expect range `[0, 1]`.
 */

#pragma glslify: remainDiv = require(../util/remain-div)

vec2 indexUV(float index, vec2 size) {
  return remainDiv(index, size.x)/max(size-1.0, 1.0);
}

vec2 indexUV(int index, ivec2 size) {
  return vec2(remainDiv(index, size.x))/max(vec2(size-1), 1.0);
}

vec2 indexUV(float index, ivec2 size) {
  return remainDiv(index, size.x)/max(vec2(size-1), 1.0);
}

vec2 indexUV(int index, vec2 size) {
  return remainDiv(index, size.x)/max(size-1.0, 1.0);
}

vec2 indexUV(float index, float size) {
  return remainDiv(index, size)/max(size-1.0, 1.0);
}
vec2 indexUV(int index, float size) {
  return remainDiv(index, size)/max(size-1.0, 1.0);
}

vec2 indexUV(float index, int size) {
  return remainDiv(index, size)/max(float(size-1), 1.0);
}

vec2 indexUV(int index, int size) {
  return vec2(remainDiv(index, size))/max(float(size-1), 1.0);
}

#pragma glslify: export(indexUV);
