/**
 * Convenience to sample entries safely at their texel center.
 *
 * @param {vec2} `uv` UV texture sample coordinate, expect range `[0, 1]`.
 * @param {vec2|ivec2} `shape` Texture's shape, expect `[width, height]`.
 * @param {float|vec2} `[offset=0.5]` Texel offset, expect range `[0, 1]`.
 *
 * @returns {vec2} The UV with offset to texel center, expect range
 *     `[0+offset, 1-offset]`/`[0+offset.x, 1-offset.y]`.
 */
vec2 offsetUV(vec2 uv, vec2 shape, float offset) {
    return ((uv*(shape-1.0))+offset)/shape;
}

vec2 offsetUV(vec2 uv, vec2 shape, vec2 offset) {
    return ((uv*(shape-1.0))+offset)/shape;
}

vec2 offsetUV(vec2 uv, ivec2 shape, float offset) {
    return ((uv*vec2(shape-1))+offset)/vec2(shape);
}

vec2 offsetUV(vec2 uv, ivec2 shape, vec2 offset) {
    return ((uv*vec2(shape-1))+offset)/vec2(shape);
}

vec2 offsetUV(vec2 uv, vec2 shape) { return offsetUV(uv, shape, 0.5); }

vec2 offsetUV(vec2 uv, ivec2 shape) { return offsetUV(uv, shape, 0.5); }

#pragma glslify: export(offsetUV);
