/**
 * Equivalent to `mod`, avoids recalculation by reusing the floored division,
 * and returns both (useful in various places, e.g: index conversion).
 *
 * @see https://www.shaderific.com/glsl-functions#modulo
 *
 * @param {float|int} `x` The first modulo/division operand, expect `x >= 0`.
 * @param {float|int} `y` The second modulo/division operand, expect `y >= 0`.
 *
 * @returns {vec2|ivec2} The modulo/division result: `[x%y, floor(x/y)]`; always
 *     a `vec2` if any operand is a `float`.
 */

vec2 modDiv(float x, float y) {
    float d = floor(x/y);
    // Equivalent to `mod`, avoids some recalculation by reusing `d`.
    // @see https://www.shaderific.com/glsl-functions#modulo
    // float m = mod(x, y);
    float m = x-(y*d);

    return vec2(m, d);
}

ivec2 modDiv(int x, int y) {
    int d = x/y;
    int m = x-(y*d);

    return ivec2(m, d);
}

vec2 modDiv(float x, int y) { return modDiv(x, float(y)); }
vec2 modDiv(int x, float y) { return modDiv(float(x), y); }

#pragma glslify: export(modDiv);
