import { macroPass } from './macros';
import { toUniforms } from './uniforms';

const { assign } = Object;

/**
 * Convenience to link different `gpgpu` states' inputs.
 *
 * @todo Handle vertex and fragment shaders.
 * @todo Handle passes.
 */
export const toLink = (state, at, to = state) => (to.update = () => {
  to.macro = macroPass(to.state = state);

  const uniforms = toUniforms(state, to.uniforms ??= {});

  if(!at) { return to; }

  /** Override uniforms to prefix the right property paths. */
  for(let k in uniforms) {
    const u = uniforms[k];

    uniforms[k] = (c, p, b) => u(c, at(c, p, b), b);
  }

  return to;
})();

/**
 * Update a state to link all but the bound data in one pass.
 *
 * @todo Ensure the right `bound` value is used for output.
 */
export function statePast(state, to = state) {
  assign(to, state);
  to.bound ??= 1;
  to.stepNow ??= 0;
  to.passNow ??= 0;

  return to;
}

/** Update a state to link all data in one pass. */
export function stateFull(state, to = state) {
  assign(to, state);
  /**
   * Draw all states with none bound as outputs.
   * @todo Errors without `merge`; why, if the framebuffer isn't bound?
   */
  to.bound ??= +(!to.merge);
  to.stepNow ??= 0;
  to.passNow ??= 0;
  (to.maps ??= {}).buffersMax ??= 0;

  return to;
}

export default toLink;
