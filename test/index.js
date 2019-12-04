/**
 * GPGPU particles drawing, may be used with this module's GPGPU setup or anything else
 * given applicable parameters.
 */

import { positions as defaultPositions } from '../../screen';
import { macroGPGPUDraw } from '../macros';
import { getGPGPUUniforms } from '../inputs.js';

import defaultVert from '../../screen/index.vert.glsl';
import defaultFrag from './index.frag.glsl';

export const debugGPGPUTest = self.debugGPGPUTest = {
    // dataRange: [-256, 256],
    // drawRange: [0, 256]
    dataRange: [0, 1],
    drawRange: [0, 1]
};

/**
 * Draws the values within GPGPU data textures.
 */
export function getGPGPUTest(regl, setup, out = setup) {
    const {
            testVert = defaultVert,
            testFrag = defaultFrag,
            testPositions: positions = defaultPositions,
            testUniforms: uniforms = getGPGPUUniforms(regl, setup, 1)
        } = setup;

    const macros = macroGPGPUDraw(setup);

    out.testVert = macros+testVert;
    out.testFrag = macros+testFrag;

    (('dataRange' in uniforms) || (uniforms.dataRange = () => debugGPGPUTest.dataRange));
    (('drawRange' in uniforms) || (uniforms.drawRange = () => debugGPGPUTest.drawRange));

    out.testUniforms = uniforms;

    const testPositions = out.testPositions = regl.buffer(positions);

    return regl({
        vert: regl.prop('testVert'),
        frag: regl.prop('testFrag'),
        attributes: { position: (c, { testPositions: p = testPositions }) => p },
        uniforms,
        count: (c, { testCount: count = positions.length*0.5 }) => count,
        depth: { enable: false }
    });
}

export default getGPGPUTest;
