/**
 * Convenience to sample entries safely at their texel center.
 * Where `spreadUV` is for lookup ranges, `offsetUV` is for lookup queries.
 *
 * @see [`spreadUV`](./spread-uv.glsl)
 *
 * @param {vec2} `uv` UV texture sample coordinate, expect range `[0, 1]`.
 * @param {float|int|vec2|ivec2} `[size=1.0]` Texture's size, expect
 *   `[width, height]`, or if given a scalar interpret both as `side`.
 * @param {float|vec2} `[pad=0.5]` Texel `pad` to offset, expect range `[0, 1]`.
 *
 * @returns {vec2} The `uv` offset by `pad` to texel center, expect range
 *   `[0+pad, 1-pad]`.
 */

vec2 offsetUV(vec2 uv, float size, float pad) {
  return ((uv*(size-1.0))+pad)/size;
}

vec2 offsetUV(vec2 uv, vec2 size, float pad) {
  return ((uv*(size-1.0))+pad)/size;
}

vec2 offsetUV(vec2 uv, vec2 size, vec2 pad) {
  return ((uv*(size-1.0))+pad)/size;
}

vec2 offsetUV(vec2 uv, int size, float pad) {
  return offsetUV(uv, float(size), pad);
}

vec2 offsetUV(vec2 uv, ivec2 size, float pad) {
  return offsetUV(uv, vec2(size), pad);
}

vec2 offsetUV(vec2 uv, ivec2 size, vec2 pad) {
  return offsetUV(uv, vec2(size), pad);
}

vec2 offsetUV(vec2 uv, float size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv, vec2 size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv, int size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv, ivec2 size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv) { return offsetUV(uv, 1.0, 0.5); }

#pragma glslify: export(offsetUV);
