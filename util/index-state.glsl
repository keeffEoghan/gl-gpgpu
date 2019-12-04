/**
 * Mappings from a sequential index to an index into a GPGPU state for a given number
 * of state steps.
 * The returned `vec3` channels denote:
 * - `xy`: the `vec2` texture lookup coordinates for this index.
 * - `z`: the `float` index of the state step texture to read from.
 *
 * @example The index mappings for various steps/sizes:
 *     (steps: 4, width: 2, height: 2) => [
 *         0 => [0/width, 0/height, 0],
 *         1 => [0/width, 0/height, 1],
 *         2 => [0/width, 0/height, 1],
 *         3 => [0/width, 0/height, 2],
 *         4 => [0/width, 0/height, 2],
 *         5 => [0/width, 0/height, 3],
 *     
 *         6 => [1/width, 0/height, 0],
 *         7 => [1/width, 0/height, 1],
 *         8 => [1/width, 0/height, 1],
 *         9 => [1/width, 0/height, 2],
 *         10 => [1/width, 0/height, 2],
 *         11 => [1/width, 0/height, 3],
 *     
 *         12 => [0/width, 1/height, 0],
 *         13 => [0/width, 1/height, 1],
 *         14 => [0/width, 1/height, 1],
 *         15 => [0/width, 1/height, 2],
 *         16 => [0/width, 1/height, 2],
 *         17 => [0/width, 1/height, 3],
 *     
 *         18 => [1/width, 1/height, 0],
 *         19 => [1/width, 1/height, 1],
 *         20 => [1/width, 1/height, 1],
 *         21 => [1/width, 1/height, 2],
 *         22 => [1/width, 1/height, 2],
 *         23 => [1/width, 1/height, 3]
 *     ].length == 24
 *     
 *     (steps: 3, width: 1, height: 2) => [
 *         0 => [0/width, 0/height, 0],
 *         1 => [0/width, 0/height, 1],
 *         2 => [0/width, 0/height, 1],
 *         3 => [0/width, 0/height, 2],
 *     
 *         4 => [0/width, 1/height, 0],
 *         5 => [0/width, 1/height, 1],
 *         6 => [0/width, 1/height, 1],
 *         7 => [0/width, 1/height, 2],
 *     
 *         8 => [0/width, 2/height, 0],
 *         9 => [0/width, 2/height, 1],
 *         10 => [0/width, 2/height, 1],
 *         11 => [0/width, 2/height, 2]
 *     ].length == 12
 */

#pragma glslify: numGPGPUPairIndexes = require('./num-pair-indexes');
#pragma glslify: getGPGPUPairIndex = require('./get-pair-index');

vec3 indexGPGPUState(in float index, in float width, in float height, in float steps) {
    float numPairs = numGPGPUPairIndexes(steps);
    float pair = index/numPairs;

    return vec3(mod(floor(pair), width)/width, floor(pair/width)/height,
        getGPGPUPairIndex(mod(index, numPairs)));
}

ivec3 indexGPGPUState(in int index, in int width, in int height, in int steps) {
    return ivec3(indexGPGPUState(float(index), float(width), float(height),
        float(steps)));
}

vec3 indexGPGPUState(in float index, in vec2 size, in float steps) {
    return indexGPGPUState(index, size.x, size.y, steps);
}

ivec3 indexGPGPUState(in int index, in ivec2 size, in int steps) {
    return ivec3(indexGPGPUState(float(index), vec2(size), float(steps)));
}

#pragma glslify: export(indexGPGPUState);
