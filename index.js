/**
 * GPGPU ping-pong buffers drawn in line segments of current/past positions.
 * Rendering approach/engine specific, decoupled from the physics code.
 * The modules here may be used as given in this file, or piecemeal, or overridden.
 */

import { macroPass } from './macros';
import { mapGroups, mapSamples } from './maps';

const props = {
    ...mapSamples([[1, 0], , [2, [1, 0]]], mapGroups([4, 2, 3, 1], 2, 4)),
    steps: [, , ], pass: 0
};

console.log(macroPass(props));
