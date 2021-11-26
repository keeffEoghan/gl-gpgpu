/**
 * Convenience to turn a 1D entry index into a 2D texture UV to sample entries.
 * Computed with `modDiv`.
 *
 * @see [modDiv]{@link ../util/mod-div.glsl}
 *
 * @param {float|int} `index` 1D index, expect range `[0, (shape.x*shape.y)-1]`.
 * @param {float|int|vec2|ivec2} `shape` Texture's shape, expect
 *     `[width, height]`, or if given a scalar interpret it as `[size, size]`.
 *
 * @returns {vec2} 2D UV texture sample coordinate, expect range `[0, 1]`.
 */

#pragma glslify: modDiv = require(../util/mod-div)

vec2 indexUV(float index, vec2 shape) { return modDiv(index, shape.x)/shape; }

vec2 indexUV(int index, ivec2 shape) {
    return vec2(modDiv(index, shape.x))/vec2(shape);
}

vec2 indexUV(float index, ivec2 shape) {
    return modDiv(index, shape.x)/vec2(shape);
}

vec2 indexUV(int index, vec2 shape) { return modDiv(index, shape.x)/shape; }

vec2 indexUV(float index, float shape) { return modDiv(index, shape)/shape; }
vec2 indexUV(int index, float shape) { return modDiv(index, shape)/shape; }

vec2 indexUV(float index, int shape) {
    return modDiv(index, shape)/float(shape);
}

vec2 indexUV(int index, int shape) {
    return vec2(modDiv(index, shape))/float(shape);
}

#pragma glslify: export(indexUV);
