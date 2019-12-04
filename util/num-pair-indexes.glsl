/**
 * The number of indexes of pairs across the given number of `steps`.
 */

float numGPGPUPairIndexes(in float steps) {
    return (steps-1.0)*2.0;
}

int numGPGPUPairIndexes(in int steps) {
    return int(numGPGPUPairIndexes(float(steps)));
}

/**
 * The number of indexes of pairs across the given number of `steps` of the given size.
 */

float numGPGPUPairIndexes(in float steps, in float indexes) {
    return numGPGPUPairIndexes(steps)*indexes;
}

float numGPGPUPairIndexes(in float steps, in float width, in float height) {
    return numGPGPUPairIndexes(steps, width*height);
}

float numGPGPUPairIndexes(in float steps, in vec2 size) {
    return numGPGPUPairIndexes(steps, size.x, size.y);
}

int numGPGPUPairIndexes(in int steps, in int indexes) {
    return int(numGPGPUPairIndexes(float(steps), float(indexes)));
}

int numGPGPUPairIndexes(in int steps, in int width, in int height) {
    return int(numGPGPUPairIndexes(float(steps), float(width), float(height)));
}

int numGPGPUPairIndexes(in int steps, in ivec2 size) {
    return int(numGPGPUPairIndexes(float(steps), vec2(size)));
}

#pragma glslify: export(numGPGPUPairIndexes);
