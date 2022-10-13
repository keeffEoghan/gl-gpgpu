/**
 * The `gpgpu` update step.
 *
 * Connects inputs to the `GL` state and renders an update step.
 *
 * @module
 */

import each from '@epok.tech/fn-lists/each';
import wrap from '@epok.tech/fn-lists/wrap';

import { macroPass } from './macros';
import { getUniforms } from './inputs';
import { vertDef, positionsDef, preDef } from './const';

const scale = { vec2: 0.5 };

export const cache = {
  clearPass: { color: [0, 0, 0, 0], depth: 1, stencil: 0 },
  copyFrame: { color: null }, copyImage: { copy: true }
};

/**
 * Convenience to get the currently active `framebuffer`.
 *
 * @see {@link state.getState}
 *
 * @param {object} state The `gpgpu` state.
 * @param {array<object>} state.passes Passes per step. See `getState`.
 * @param {number} [state.stepNow] The currently active state step, if any.
 * @param {number} [state.passNow] The currently active draw pass, if any.
 *
 * @returns {object} The active step's active pass object, if any.
 */
export const getPass = ({ passes: ps, stepNow: s, passNow: p }) =>
  wrap(s, ps)?.[p];

/**
 * Merged `texture` update, called upon each pass.
 *
 * Copies the active pass's output into the merged `texture`, from each of its
 * attachments one by one (to support multiple draw buffers).
 * Matches the lookup logic defined in `macroTaps`.
 *
 * @todo Update docs.
 *
 * @see [SO reading from multiple `framebuffers`](https://stackoverflow.com/a/34160982/716898)
 * @see {@link getPass}
 * @see {@link state.texture}
 * @see {@link state.getState}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroTaps}
 *
 * @param {object} state A `gpgpu` state of the active pass.
 * @param {array<object<array<texture>,array<number>>>} state.passes Passes per
 *   step; the active one is found via `getPass`, with a `color` array of
 *   `texture`s, and a `map` array of numbers showing how the textures are
 *   grouped into the pass. See `getState` and `mapGroups`.
 * @param {merge} state.merge The merged `texture` to update.
 * @param {number} [state.stepNow] The currently active state step, if any.
 *
 * @returns {texture} The merged `texture`, updated by the active pass's output;
 *   matches the lookup logic defined in `macroTaps`.
 */
 export function updateMerge(state) {
  const { color, map: pass } = getPass(state);
  const { merge, stepNow: s, size } = state;
  const { all: { texture: to }, next: { framebuffer: f } } = merge;

  // Silent exit if there's not enough info ready now to perform the update.
  if(!(to && f && color && pass && (s || (s === 0)))) { return to; }

  const { steps: sl, shape: [w, h] } = size;
  /** Start at the top of the `texture`, move down row-per-step and wrap. */
  const y = (s%sl)*h;
  const { copyFrame: cf, copyImage: ci } = cache;

  /** Reusable `framebuffer` copies pass's pixels to the merged `texture`. */
  each((c, i) =>
      ((cf.color = c) && f(cf).use(() => to.subimage(ci, pass[i]*w, y))),
    color);

  return to;
}

/**
 * Creates a `gpgpu` update step function, for use with a `gpgpu` state object.
 *
 * @todo Make this fully extensible in state.
 * @todo Example
 *
 * @see {@link buffer}
 * @see {@link command}
 * @see {@link subimage}
 * @see {@link onStep}
 * @see {@link onPass}
 * @see {@link getPass}
 * @see {@link state.getState}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroPass}
 * @see {@link inputs.getUniforms}
 *
 * @param {object} api An API for `GL` resources.
 * @param {buffer} [api.buffer] Function to set up a `GL` buffer.
 * @param {clear} [api.clear] Function to clear `GL` view or `framebuffer`.
 * @param {command} [api.command=api] Function to create a `GL` render pass,
 *   given options, to be called later with options; `api` if not given.
 * @param {object} state The `gpgpu` state to use. See `getState` and
 *   `mapGroups`.
 * @param {object} state.maps How values are grouped per-`texture` per-pass
 *   per-step. See `mapGroups`.
 * @param {array<array<number>>} state.passes How textures are grouped into
 *   passes. See `mapGroups`.
 * @param {object} [state.merge] Any merged state `texture`; uses separate state
 *   textures if not given.
 * @param {object} [state.merge.texture] Any `GL` `texture` of `state.merge`.
 * @param {subimage} [state.merge.texture.subimage] A function to update part of
 *   the merge `GL` `texture` object data. See `subimage`.
 * @param {function} [state.merge.update] Hook to update, if any; if not given,
 *   `state.merge.texture` is updated here with active states upon each pass.
 *
 *   The default merged `texture` is laid out as `[texture, step]` on the
 *   `[x, y]` axes, respectively; if other layouts are needed, this merge update
 *   hook can be given to use as-is, and the setup and lookup logic in their
 *   respective hooks.
 *
 *   See `getState` and `macroTaps`.
 * @param {string} [state.pre=preDef] The namespace prefix; `preDef` by default.
 * @param {object} [state.step=to] The properties for the step `GL` command.
 * @param {string} [state.step.vert=vertDef] The step vertex shader `GLSL`; a
 *   simple flat screen shader if not given.
 * @param {string} state.step.frag The step fragment shader `GLSL`.
 * @param {object} [state.step.uniforms=getUniforms(state)] The step uniforms;
 *   modifies any given. See `getUniforms`.
 * @param {array<number>|buffer} [state.step.positions=positionsDef()] The step
 *   position attributes; 3 points of a large flat triangle if not given.
 * @param {number} [state.step.count=state.step.positions.length*scale.vec2] The
 *   number of elements/attributes to draw.
 * @param {object} [state.step.passCommand] Any `GL` command properties to mix
 *   in over the default ones here, and passed to `api.command`.
 * @param {string} [state.step.vert=vertDef] Vertex `GLSL` code to append to.
 * @param {array} [state.step.verts] Preprocesses and caches vertex `GLSL` code
 *   per-pass if given, otherwise processes it just-in-time before each pass.
 * @param {string} [state.step.frag] Fragment shader `GLSL` to append to.
 * @param {array} [state.step.frags] Preprocesses and caches fragment `GLSL`
 *   code per-pass, otherwise processes it just-in-time before each pass.
 * @param {onStep} [onStep] Callback upon each step.
 * @param {onPass} [onPass] Callback upon each pass.
 * @param {object} [to=(state.step ?? \{\})] The results object; `state.step` or
 *   a new object if not given.
 *
 * @returns {object} `to` The given `to` object; containing a `gpgpu` update
 *   step function and related properties, to be passed a `gpgpu` state.
 * @returns {string} `to.vert` The given/new `state.vert` vertex shader `GLSL`.
 * @returns {string} `to.frag` The given `state.frag` fragment shader `GLSL`.
 * @returns {array.string} `[to.verts]` Any cached pre-processed vertex shaders
 *   `GLSL`, if `state.step.verts` was given.
 * @returns {array.string} `[to.frags]` Any cached pre-processed fragment
 *   shaders `GLSL`, if `state.step.verts` was enabled.
 * @returns {object} `to.uniforms` The given `state.uniforms`.
 * @returns {number} `to.count` The given/new `state.count`.
 * @returns {buffer} `to.positions` The given/new `state.positions`; via
 *   `api.buffer`.
 * @returns {command} `to.pass` A `GL` command function to draw a given pass;
 *   via `api`/`api.command`.
 * @returns {function} `to.run` The main step function, which performs all the
 *   draw pass `GL` commands for a given state step.
 */
export function getStep(api, state, to = state.step ?? {}) {
  const { buffer, clear, command = api } = api;
  const { maps: { passes }, merge, pre: n = preDef, step = to } = state;
  let { positions = positionsDef() } = step;

  const {
      passCommand, vert = vertDef, verts, frag, frags, uniforms,
      count = positions.count ?? positions.length*scale.vec2
    } = step;

  to.vert = vert;
  to.frag = frag;
  to.uniforms = getUniforms(state, uniforms);
  to.count = count;
  positions = to.positions = buffer(positions);

  // May pre-process and keep the shaders for all passes in advance.
  if(verts || frags) {
    // Keep the current pass.
    const { passNow } = state;

    verts && (to.verts = verts);
    frags && (to.frags = frags);

    each((pass, p) => {
        // Create macros for this pass in advance.
        state.passNow = p;
        // Specify the shader type, for per-shader macro hooks.
        verts && (verts[p] ??= macroPass(state, 'vert')+vert);
        frags && (frags[p] ??= macroPass(state, 'frag')+frag);
      },
      passes);

    // Set the pass back to what it was.
    state.passNow = passNow;
  }

  /** The render command describing a full `GL` state for a step. */
  to.pass = command(to.passCommand = {
    // Uses the full-screen vertex shader state by default.
    vert(_, s = state) {
      const { passNow: p, step } = s;
      const { vert: v = vert, verts: vs = verts } = step;

      // Specify the shader type, for per-shader macro hooks.
      return vs?.[p] ?? macroPass(s, 'vert')+v;
    },
    frag(_, s = state) {
      const { passNow: p, step } = s;
      const { frag: f = frag, frags: fs = frags } = step;

      // Specify the shader type, for per-shader macro hooks.
      return fs?.[p] ?? macroPass(s, 'frag')+f;
    },
    attributes: {
      [n+'position']: (_, s = state) => s.step.positions ?? positions
    },
    uniforms, count,
    depth: { enable: false },
    /** Note that this may draw to the screen if there's no active pass. */
    framebuffer: (_, s = state) => getPass(s)?.framebuffer,
    ...passCommand
  });

  /** Any merged `texture`'s update, set up if not already given. */
  merge && (merge.update ??= updateMerge);

  /** Executes the next step and all its passes. */
  to.run = (s = state) => {
    const { steps, step, merge } = s;
    const stepNow = s.stepNow = s.stepNow+1 || 0;
    const mergeUpdate = merge?.update;
    const { pass, onPass, onStep } = step;
    const stepProps = onStep?.(s, wrap(stepNow, steps)) ?? s;
    const { clearPass } = cache;

    each((p, i) => {
        stepProps.passNow = i;

        const passProps = onPass?.(stepProps, p) ?? stepProps;

        /** @todo Remove unnecessary `clear` call? */
        ((clearPass.framebuffer = getPass(passProps)?.framebuffer) &&
          clear(clearPass));

        pass(passProps);
        // Update any merged `texture` upon each pass.
        mergeUpdate?.(passProps);
      },
      stepProps.maps.passes);

    return s;
  };

  return to;
}

/**
 * @callback buffer
 * Function to set up a `GL` buffer; from a `GL` API.
 *
 * **Returns**
 * - `buffer` A `GL` buffer to use for vertex attributes, or an
 *   object serving that purpose.
 * - `[buffer.count]` The buffer element/vertex count.
 * - `[buffer.length]` The length of the buffer data `array`.
 *
 * @todo [Fix `@callback` format for return details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getStep}
 *
 * @param {array<number>|{}} data The buffer data, as `array` or `buffer`.
 *
 * @returns {{}}
 */

/**
 * @callback clear
 * Function to clear `GL` output view or `framebuffer`; from a `GL` API.
 *
 * @todo [Fix `@callback` format for return details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getStep}
 * @see {@link state.framebuffer}
 *
 * @param {object} props The values to clear with.
 * @param {array<number>} [color] The values to clear any color buffers with.
 * @param {number} [depth] The value to clear any depth buffer with.
 * @param {number} [stencil] The value to clear any stencil buffer with.
 * @param {framebuffer} [framebuffer] Any `framebuffer` to clear; if not given,
 *   clears any active `framebuffer` or the view.
 *
 * @returns {void}
 */

/**
 * @callback command
 * Function to create a `GL` render pass execution function, to be called later,
 * with options, for a render pass; from a `GL` API.
 *
 * **Returns**
 * - Function to execute a `GL` render pass, with options, for a render pass.
 *
 * @todo [Fix `@callback` format for return details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getStep}
 * @see {@link step.getUniforms}
 * @see {@link state.framebuffer}
 *
 * @param {object} passCommand The properties from which to create the `GL`
 *   render function for a given pass.
 * @param {function} [passCommand.vert] Function hook returning the vertex
 *   shader `GLSL` string for the next render pass.
 * @param {function} [passCommand.frag] Function hook returning the fragment
 *   shader `GLSL` string for the next render pass.
 * @param {object<buffer>} [passCommand.attributes] The vertex attributes for
 *   the next render pass.
 * @param {object<function>} [passCommand.uniforms] The uniform hooks for the
 *   given `props`. See `getUniforms`.
 * @param {number} [passCommand.count] The number of elements to draw.
 * @param {object<boolean,{}>} [passCommand.depth] An object describing the
 *   depth settings for the next render pass; e.g: `passCommand.depth.enable`.
 * @param {function} [passCommand.framebuffer] Function hook returning the
 *   `framebuffer` to draw to in the next render pass. See `framebuffer`.
 *
 * @returns {function}
 */

/**
 * @callback subimage
 * Function of a `GL` `texture` to update part of it with new data; from a `GL`
 * API.
 *
 * **Returns**
 * - The calling `texture`, with part updated part to `data`.
 *
 * @todo [Fix `@callback` format for return details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getStep}
 * @see {@link state.texture}
 *
 * @param {texture} data The data to update into part of the calling `texture`.
 * @param {number} [x=0] Offset on the x-axis within the calling `texture`.
 * @param {number} [y=0] Offset on the y-axis within the calling `texture`.
 *
 * @returns {texture}
 */

/**
 * @callback onStep
 * Callback upon each step.
 *
 * **Returns**
 * - A `stepProps` object to use for each of the step's next passes; or
 *   `null`ish to use the given `props`.
 *
 * @todo [Fix `@callback` format for return details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getStep}
 * @see {@link state.getState}
 * @see {@link state.framebuffer}
 *
 * @param {object} [props] The `props` passed to `run`.
 * @param {array<framebuffer>} step The `framebuffer`s for `props.stepNow` from
 *   `props.steps`, where the next state step will be drawn. See `getState`.
 *
 * @returns {{}}
 */

/**
 * @callback onPass
 * Callback upon each pass.
 *
 * **Returns**
 * - A `passProps` object to use for the render `command` call; or `null`ish to
 *   use the given `stepProps`.
 *
 * @todo [Fix `@callback` format for return details](https://github.com/TypeStrong/typedoc/issues/1896)
 *
 * @see {@link getStep}
 * @see {@link maps.mapGroups}
 *
 * @param {object} [stepProps] The `props` passed to `run` via any `onStep`.
 * @param {array<number>} pass The maps for the next pass. See `mapGroups`.
 *
 * @returns {{}}
 */

/** A wrapper around `updateMerge`, handy for testing. */
function updateMergeTest(state, update = updateMerge, after = 2) {
  const { color, map: pass } = getPass(state);
  const { merge: { all, next }, stepNow: s, passNow: p, size, maps } = state;
  const { channels } = all;
  const { steps: sl, shape: [w, h], merge: { shape: [wl, hl] } } = size;
  const tl = maps.textures.length;
  const y = (s%sl)*h;
  const lc = y*tl*w;
  const f = next?.framebuffer;
  const to = update(state);

  console.warn(s, p, pass, ':');
  console.warn('- l', 0, 'r', tl*w, 'w', w, 'wl', wl);
  console.warn('- t', y, 'b', y+h, 'h', h, 'hl', hl);
  console.warn('- c', channels, 'lc', lc*channels, 'rc', (lc+(w*h))*channels,
    'sc', w*h*channels, 'slc', wl*hl*channels);

  f({ color: to }).use(() =>
    console.warn(Array.prototype.reduce.call(regl.read(), (o, v, i) =>
        o+((i)? ',\t' : '')+
        ((!i)? ''
        : ((i%(tl*w*h*channels) === 0)?
            `\n${'='.repeat(100)}step${'='.repeat(100)}\n`
        : ((i%(tl*w*channels) === 0)? '\n'
        : ((i%(w*channels) === 0)? ' || \t'
        : ((i%channels === 0)? ' / \t' : '')))))+
        (i*1e-3).toFixed(3).slice(2)+': '+((v)? v.toFixed(2) : '___'),
      '\n')));

  if(s && after && s%(sl*after) === 0) { debugger; }

  return to;
}

export default getStep;
