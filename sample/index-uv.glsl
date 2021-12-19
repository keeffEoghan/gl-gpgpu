/**
 * Convenience to turn a 1D entry index into a 2D texture UV to sample entries.
 * Note that this does not wrap the y-axis, so if the `index` exceeds the range
 * `[0, (shape.x*shape.y)-1]`, the output will exceed the range `[0, 1]` on the
 * y-axis; this can be done by `mod(indexUV(index, shape), shape)` if desired.
 *
 * @see [remainDiv]{@link ../util/remain-div.glsl}
 *
 * @param {float|int} `index` 1D index, expect range `[0, (shape.x*shape.y)-1]`.
 * @param {float|int|vec2|ivec2} `shape` Texture's shape, expect
 *     `[width, height]`, or if given a scalar interpret it as `[size, size]`.
 *
 * @returns {vec2} 2D UV texture sample coordinate, expect range `[0, 1]`.
 */

#pragma glslify: remainDiv = require(../util/remain-div)

vec2 indexUV(float index, vec2 shape) {
    return remainDiv(index, shape.x)/max(shape-1.0, 1.0);
}

vec2 indexUV(int index, ivec2 shape) {
    return vec2(remainDiv(index, shape.x))/max(vec2(shape-1), 1.0);
}

vec2 indexUV(float index, ivec2 shape) {
    return remainDiv(index, shape.x)/max(vec2(shape-1), 1.0);
}

vec2 indexUV(int index, vec2 shape) {
    return remainDiv(index, shape.x)/max(shape-1.0, 1.0);
}

vec2 indexUV(float index, float shape) {
    return remainDiv(index, shape)/max(shape-1.0, 1.0);
}
vec2 indexUV(int index, float shape) {
    return remainDiv(index, shape)/max(shape-1.0, 1.0);
}

vec2 indexUV(float index, int shape) {
    return remainDiv(index, shape)/max(float(shape-1), 1.0);
}

vec2 indexUV(int index, int shape) {
    return vec2(remainDiv(index, shape))/max(float(shape-1), 1.0);
}

#pragma glslify: export(indexUV);
