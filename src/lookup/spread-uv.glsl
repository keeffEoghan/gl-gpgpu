/**
 * Convenience to spread entries safely to their texel edges range.
 * Where `offsetUV` is for lookup queries, `spreadUV` is for lookup ranges.
 *
 * @see [`offsetUV`](./offset-uv.glsl)
 *
 * @param {vec2} `uv` UV texture sample coordinate, expect range `[0, 1]`.
 * @param {float|int|vec2|ivec2} `[size=1.0]` Texture's size, expect
 *   `[width, height]`, or if given a scalar interpret both as `side`.
 * @param {float|vec2} `[pad=0.5]` Texel `pad` to spread, expect range `[0, 1]`.
 *
 * @returns {vec2} The UV with spread to texel edges, expect range
 *   `[0-pad, size+pad]`.
 */

vec2 spreadUV(vec2 uv, float size, float pad) { return (uv*(size+1.0))-pad; }
vec2 spreadUV(vec2 uv, vec2 size, float pad) { return (uv*(size+1.0))-pad; }
vec2 spreadUV(vec2 uv, vec2 size, vec2 pad) { return (uv*(size+1.0))-pad; }

vec2 spreadUV(vec2 uv, int size, float pad) {
  return spreadUV(uv, float(size), pad);
}

vec2 spreadUV(vec2 uv, ivec2 size, float pad) {
  return spreadUV(uv, vec2(size), pad);
}

vec2 spreadUV(vec2 uv, ivec2 size, vec2 pad) {
  return spreadUV(uv, vec2(size), pad);
}

vec2 spreadUV(vec2 uv, float size) { return spreadUV(uv, size, 0.5); }
vec2 spreadUV(vec2 uv, vec2 size) { return spreadUV(uv, size, 0.5); }
vec2 spreadUV(vec2 uv, int size) { return spreadUV(uv, size, 0.5); }
vec2 spreadUV(vec2 uv, ivec2 size) { return spreadUV(uv, size, 0.5); }
vec2 spreadUV(vec2 uv) { return spreadUV(uv, 1.0, 0.5); }

#pragma glslify: export(spreadUV);
