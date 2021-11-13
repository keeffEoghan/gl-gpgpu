/**
 * GPGPU particles drawing, may be used with this module's GPGPU setup.
 */

import clamp from 'clamp';

import { macroGPGPUDraw } from '../../macros';

import {
        getGPGPUUniforms, getGPGPUDrawIndexes, numGPGPUPairIndexes
    } from '../../inputs.js';

import vertDef from './draw.vert.glsl';
import fragDef from './draw.frag.glsl';

export function getDrawParticlesVerlet3D(regl, setup, out = setup) {
    const {
            drawVert = vertDef,
            drawFrag = fragDef,
            drawIndexes: indexes = getGPGPUDrawIndexes(setup),
            drawUniforms: uniforms = getGPGPUUniforms(regl, setup)
        } = setup;

    const macros = macroGPGPUDraw(setup);

    out.drawVert = macros+drawVert;
    out.drawFrag = macros+drawFrag;

    uniforms.pointSize = (uniforms.pointSize ??
        (c, { drawPointSize: s = 10, drawPointClamp: r }) =>
            clamp(s, ...(r ?? regl.limits.pointSizeDims)));

    out.drawUniforms = uniforms;

    const drawIndexes = out.drawIndexes = regl.buffer(indexes);

    return regl({
        vert: regl.prop('drawVert'),
        frag: regl.prop('drawFrag'),
        attributes: { index: (_, { drawIndexes: i = drawIndexes }) => i },
        uniforms,
        primitive: (_, { primitive: p = 'points' }) => p,
        lineWidth: (_, { drawLineWidth: w = 10, drawLineClamp: c }) =>
            clamp(w, ...(c || regl.limits.lineWidthDims)),
        count: (_, props) => (props.drawCount ?? numGPGPUPairIndexes(props)),
        depth: { enable: false }
    });
}

export default getDrawParticlesVerlet3D;
