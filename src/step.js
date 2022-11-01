/**
 * The `gpgpu` update step.
 *
 * Connects inputs to the `GL` state and renders an update step.
 *
 * @module
 * @category JS
 *
 * @todo [Fix `@callback`/`@typedef`](https://github.com/TypeStrong/typedoc/issues/1896):
 *   nested `@param`; omits `@return`/`@see`/`@this`
 */

import each from '@epok.tech/fn-lists/each';
import wrap from '@epok.tech/fn-lists/wrap';

import { macroPass } from './macros';
import { getUniforms, getAttributes } from './inputs';
import { vertDef, preDef } from './const';

/**
 * Default clear settings to clear each pass's `framebuffer`.
 *
 * @see {@link api.clear}
 * @see {@link api.framebuffer}
 *
 * @type {{color:[0,0,0,0],depth:1,stencil:0,framebuffer?:framebuffer}}
 * @prop {framebuffer} [framebuffer] Any `framebuffer` to clear, set upon each
 *   pass.
 */
export const clearPassDef = { color: [0, 0, 0, 0], depth: 1, stencil: 0 };

/**
 * Default `framebuffer.call` options, to bind a given `color` to it.
 *
 * @see {@link updateMerge}
 * @see {@link framebuffer}
 * @see {@link framebuffer.call}
 *
 * @prop {texture|null} color Any `texture` to bind as a `framebuffer` output.
 */
export const copyFrameDef = { color: null };

/**
 * Default `texture.subimage` options, to bind a given `color`.
 *
 * @see {@link updateMerge}
 * @see {@link texture}
 * @see {@link texture.subimage}
 *
 * @prop {true} copy Indicates the
 */
export const copyImageDef = { copy: true };

/**
 * Convenience to get the currently active `framebuffer`.
 *
 * @see {@link getStep}
 * @see {@link state.getState}
 *
 * @param {object} state The `gpgpu` state.
 * @param {object[][]} state.passes Passes per step. See `getState`.
 * @param {number} [state.stepNow] Any active state step index. See `getStep`.
 * @param {number} [state.passNow] Any active draw pass index. See `getStep`.
 *
 * @returns {object} Any active step's active pass object, of the given `state`.
 */
export const getPass = ({ passes: ps, stepNow: s, passNow: p }) =>
  wrap(s, ps)?.[p];

/**
 * Merged `texture` update, called upon each pass.
 *
 * Copies the active pass's output into the merged `texture`, from each of its
 * `framebuffer` attachments one by one (to support multiple draw buffers).
 * Matches the lookup logic defined in `macroTaps`.
 *
 * @todo Update docs.
 *
 * @see [SO reading from multiple `framebuffer`s](https://stackoverflow.com/a/34160982/716898)
 * @see {@link getPass}
 * @see {@link state.framebuffer}
 * @see {@link state.texture}
 * @see {@link state.getState}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroTaps}
 *
 * @param {object} state A `gpgpu` state of the active pass.
 * @param {{color:texture[],map:number[]}[][]} state.passes Passes per
 *   step; any active one's found via `getPass`, with:
 *   - `color`: `array` of data-`texture`s.
 *   - `map`: `array` of `number`s, showing how the `texture`s are grouped
 *     per-pass. See `getPass`, `getState`, and `mapGroups`.
 * @param {merge} state.merge The merged `texture` to update.
 * @param {number} [state.stepNow] The currently active state step, if any.
 *
 * @returns {texture} The merged `texture`, updated by the active pass's output;
 *   matches the lookup logic defined in `macroTaps`.
 */
export function updateMerge(state) {
  const { color, map: pass } = getPass(state);
  const { merge, stepNow: s, size } = state;
  const { all: { texture }, next: { framebuffer } } = merge;
  const to = texture?.subimage;
  let f = framebuffer?.call;

  // Silent exit if there's not enough info ready now to perform the update.
  if(!(to && f && color && pass && (s || (s === 0)))) { return texture; }

  /** Support both `regl`-style extended `function`s and plain `object` APIs. */
  (f !== Function.call) && (f = f.call);

  const { steps: sl, shape: [w, h] } = size;
  /** Start at the top of the `texture`, move down row-per-step and wrap. */
  const y = (s%sl)*h;
  const { copyFrame: cf = copyFrameDef, copyImage: ci = copyImageDef } = step;

  /**
   * Reusable `framebuffer` binds and copies each of the pass `texture`s along
   * the merged `texture`.
   */
  each((c, i) =>
      (cf.color = c) &&
        f.call(f, cf).use.call(f, () => to.call(texture, ci, pass[i]*w, y)),
    color);

  return texture;
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
 * @param {number[][]} state.maps.passes How textures are grouped into passes.
 *   See `mapGroups`.
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
 * @param {number[]|buffer} [state.step.positions=positionsDef()] The step
 *   position attributes; 3 points of a large flat triangle if not given.
 * @param {number} [state.step.count=state.step.positions.length*0.5] The
 *   number of elements/attributes to draw.
 * @param {object} [state.step.passCommand] Any `GL` command properties to mix
 *   in over the default ones here, and passed to `api.command`.
 * @param {string} [state.step.vert=vertDef] Vertex `GLSL` code to append to.
 * @param {string[]} [state.step.verts] Preprocesses and caches vertex `GLSL`
 *   code per-pass if given, otherwise processes just-in-time before each pass.
 * @param {string} [state.step.frag] Fragment shader `GLSL` to append to.
 * @param {string[]} [state.step.frags] Preprocesses and caches fragment `GLSL`
 *   code per-pass, otherwise processes just-in-time before each pass.
 * @param {onStep} [onStep] Callback upon each step.
 * @param {onPass} [onPass] Callback upon each pass.
 * @param {object} [to=(state.step ?? \{\})] The results object; `state.step` or
 *   a new object if not given.
 *
 * @returns {object} `to` The given `to` object; containing a `gpgpu` update
 *   step function and related properties, to be passed a `gpgpu` state.
 * @returns {string} `to.vert` The given/new `state.vert` vertex shader `GLSL`.
 * @returns {string} `to.frag` The given `state.frag` fragment shader `GLSL`.
 * @returns {string[]} `[to.verts]` Any cached pre-processed vertex shaders
 *   `GLSL`, if `state.step.verts` was given.
 * @returns {string[]} `[to.frags]` Any cached pre-processed fragment shaders
 *   `GLSL`, if `state.step.verts` was given.
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

  const { passCommand, vert = vertDef, verts, frag, frags } = step;
  const { count = positions.count ?? positions.length*0.5 } = step;
  const uniforms = to.uniforms = getUniforms(state);

  to.vert = vert;
  to.frag = frag;
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
      [n+'position']: (_, s = state) =>
        s.step.positions ?? to.positions ?? positions
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
    /** Look out for integer overflow. */
    const stepNow = s.stepNow = Math.max(s.stepNow+1 || 0, 0);
    const mergeUpdate = merge?.update;
    const { pass, onPass, onStep, clearPass = clearPassDef } = step;
    const stepProps = onStep?.(s, wrap(stepNow, steps)) ?? s;

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

    delete clearPass.framebuffer;

    return s;
  };

  return to;
}

/**
 * @todo [Fix `@callback`/`@typedef`](https://github.com/TypeStrong/typedoc/issues/1896):
 *   nested `@param`; omits `@return`/`@see`/`@this`
 *
 * @callback onStep
 * Callback upon each step.
 *
 * **See**
 * - {@link getStep}
 * - {@link state.getState}
 * - {@link state.framebuffer}
 *
 * **Returns**
 * - A `stepProps` object to use for each of the step's next passes; or
 *   `null`ish to use the given `props`.
 *
 * @param {object} [props] The `props` passed to `run`.
 * @param {framebuffer[]} step The `framebuffer`s for `props.stepNow` from
 *   `props.steps`, where the next state step will be drawn. See `getState`.
 *
 * @returns {object}
 */

/**
 * @todo [Fix `@callback`/`@typedef`](https://github.com/TypeStrong/typedoc/issues/1896):
 *   nested `@param`; omits `@return`/`@see`/`@this`
 *
 * @callback onPass
 * Callback upon each pass.
 *
 * **See**
 * - {@link getStep}
 * - {@link maps.mapGroups}
 *
 * **Returns**
 * - A `passProps` object to use for the render `command` call; or `null`ish to
 *   use the given `stepProps`.
 *
 * @param {object} [stepProps] The `props` passed to `run` via any `onStep`.
 * @param {number[]} pass The maps for the next pass. See `mapGroups`.
 *
 * @returns {object}
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
  const to = update(state);
  let f = next?.framebuffer?.call;

  /** Support both `regl`-style extended `function`s and plain `object` APIs. */
  (f !== Function.call) && (f = f?.call);

  console.warn(s, p, pass, ':');
  console.warn('- l', 0, 'r', tl*w, 'w', w, 'wl', wl);
  console.warn('- t', y, 'b', y+h, 'h', h, 'hl', hl);
  console.warn('- c', channels, 'lc', lc*channels, 'rc', (lc+(w*h))*channels,
    'sc', w*h*channels, 'slc', wl*hl*channels);

  f.call(f, { color: to }).use.call(f, () =>
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
