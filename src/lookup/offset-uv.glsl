/**
 * Convenience to sample entries safely at their texel center.
 *
 * @param {vec2} `uv` UV texture sample coordinate, expect range `[0, 1]`.
 * @param {float|int|vec2|ivec2} `[size=1.0]` Texture's size, expect
 *   `[width, height]`, or if given a scalar interpret both as `side`.
 * @param {float|vec2} `[offset=0.5]` Texel offset, expect range `[0, 1]`.
 *
 * @returns {vec2} The UV with offset to texel center, expect range
 *   `[0+offset, 1-offset]`/`[0+offset.x, 1-offset.y]`.
 */

vec2 offsetUV(vec2 uv, float size, float offset) {
  return ((uv*(size-1.0))+offset)/size;
}

vec2 offsetUV(vec2 uv, vec2 size, float offset) {
  return ((uv*(size-1.0))+offset)/size;
}

vec2 offsetUV(vec2 uv, vec2 size, vec2 offset) {
  return ((uv*(size-1.0))+offset)/size;
}

vec2 offsetUV(vec2 uv, int size, float offset) {
  return offsetUV(uv, float(size), offset);
}

vec2 offsetUV(vec2 uv, ivec2 size, float offset) {
  return offsetUV(uv, vec2(size), offset);
}

vec2 offsetUV(vec2 uv, ivec2 size, vec2 offset) {
  return offsetUV(uv, vec2(size), offset);
}

vec2 offsetUV(vec2 uv, float size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv, vec2 size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv, int size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv, ivec2 size) { return offsetUV(uv, size, 0.5); }
vec2 offsetUV(vec2 uv) { return offsetUV(uv, 1.0, 0.5); }

#pragma glslify: export(offsetUV);
