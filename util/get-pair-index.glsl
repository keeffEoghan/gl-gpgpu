/**
 * The index of a pair for the given sequential `index`. How to index into a number of
 * pairs given by `numGPGPUIndexPairs`.
 */

float getGPGPUPairIndex(in float index) {
    return floor((index+1.0)*0.5);
}

int getGPGPUPairIndex(in int index) {
    return int(getGPGPUPairIndex(float(index)));
}

#pragma glslify: export(getGPGPUPairIndex);
