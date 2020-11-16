/**
 * GPGPU ping-pong buffers drawn in line segments of current/past positions.
 * Rendering approach/engine specific, decoupled from the physics code.
 * The modules here may be used as given in this file, or piecemeal, or overridden.
 */

import regl from 'regl';

import { mapGroups } from './maps';
import { getState, extensions, optionalExtensions } from './state';

const state = { maps: mapGroups([4, 2, 3], 2, 4), steps: 1 };

console.log(JSON.stringify(state, null, 4));
console.log(getState(regl({ extensions, optionalExtensions }), state));
