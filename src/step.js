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

import {
    vertDef, preDef, positionsDef, countDef, stepMaxDef, copyImageDef,
    clearPassDef
  } from './const';

const { call } = Function;

/**
 * Convenience to get the currently active `framebuffer`.
 *
 * @see {@link toStep}
 * @see {@link data.toData}
 *
 * @param {object} state The `gpgpu` state.
 * @param {object[][]} state.passes Passes per step. See `toData`.
 * @param {number} [state.stepNow] Any active state step index. See `toStep`.
 * @param {number} [state.passNow] Any active draw pass index. See `toStep`.
 *
 * @returns {object} Any active step's active pass object, of the given `state`.
 */
export const getPass = ({ passes: ps, stepNow: s, passNow: p }) =>
  wrap(s, ps)?.[p];

/**
 * Resolve a shader given as either a `string` or `function`.
 *
 * @param {string|(*,*)=>string} shader A shader `string`, or a `function` that
 *   returns one when given the `context` and `state` arguments.
 * @param {*} [context] A `context` passed to `shader` if it's a `function`.
 * @param {*} [state] A `state` passed to `shader` if it's a `function`.
 *
 * @returns {string} The given `shader` if it's a `string`; otherwise if it's a
 *   `function` the `string` returned by calling it with `context` and `state`.
 */
export const toShader = (shader, context, state) =>
  ((shader.call === call)? shader(context, state) : shader);

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
 * @see {@link data.toData}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroTaps}
 *
 * @param {object} state A `gpgpu` state of the active pass.
 * @param {{color:texture[],map:number[]}[][]} state.passes Passes per
 *   step; any active one's found via `getPass`, with:
 *   - `color`: `array` of data-`texture`s.
 *   - `map`: `array` of `number`s, showing how the `texture`s are grouped
 *     per-pass. See `getPass`, `toData`, and `mapGroups`.
 * @param {merge} state.merge The merged `texture` to update.
 * @param {number} [state.stepNow] The currently active state step, if any.
 *
 * @returns {texture} The merged `texture`, updated by the active pass's output;
 *   matches the lookup logic defined in `macroTaps`.
 */
export function updateMerge(state) {
  const {
      merge, stepNow: s, size,
      copyImage: ci = state.copyImage = copyImageDef()
    } = state;

  const { color: cs, map: pass } = getPass(state);
  const { all: { texture: t }, next } = merge;
  const sub = t?.subimage;
  const { color } = next;
  let f = next.framebuffer;

  /** Handle `object`s or `regl`-like extended `function`s. */
  (f?.call !== Function.call) && (f = f?.call);

  // Silent exit if there's not enough info ready now to perform the update.
  if(!(sub && f && cs && pass && (s || (s === 0)))) { return t; }

  const { steps: sl, width: w, height: h } = size;
  /** Start at the top of the `texture`, move down row-per-step and wrap. */
  const y = wrap(s, sl)*h;

  /**
   * Reusable `framebuffer` binds and copies each of the pass `texture`s along
   * the merged `texture`.
   */
  each((c, i) =>
    (next.color = c) &&
      f.call(f, next).use.call(f, () => sub.call(t, ci, pass[i]*w, y)),
    cs);

  /** Reset any changed properties. */
  next.color = color;
  f.call(f, next);

  return t;
}

/**
 * Creates a `gpgpu` update step function, for use with a `gpgpu` state object.
 *
 * @todo Make this fully and consistently extensible; improve `pipeline`.
 * @todo Example.
 *
 * @see {@link buffer}
 * @see {@link command}
 * @see {@link subimage}
 * @see {@link onStep}
 * @see {@link onPass}
 * @see {@link getPass}
 * @see {@link data.toData}
 * @see {@link maps.mapGroups}
 * @see {@link macros.macroPass}
 * @see {@link inputs.toUniforms}
 *
 * @param {object} api An API for `GL` resources.
 * @param {buffer} [api.buffer] Function to set up a `GL` buffer.
 * @param {clear} [api.clear] Function to clear `GL` view or `framebuffer`.
 * @param {command} [api.command=api] Function to create a `GL` render pass,
 *   given options, to be called later with options; `api` if not given.
 * @param {object} state The `gpgpu` state to use. See `toData` and `mapGroups`.
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
 *   See `toData` and `macroTaps`.
 * @param {string} [state.pre=preDef] The namespace prefix; `preDef` by default.
 * @param {string} [state.vert=vertDef] The step vertex shader `GLSL`; a
 *   simple flat screen shader if not given.
 * @param {string} state.frag The step fragment shader `GLSL`.
 * @param {object} [state.uniforms=toUniforms(state)] The step uniforms;
 *   modifies any given. See `toUniforms`.
 * @param {number[]|buffer} [state.positions=positionsDef()] The step position
 *   `attribute`s; 3 points of a large flat triangle if not given.
 * @param {number} [state.count=state.positions.length*0.5] The `number` of
 *   elements/`attribute`s to draw.
 * @param {object} [state.pipeline] Any `GL` command properties to mix in
 *   overriding those ones added here; all passed to `api.command`.
 * @param {string} [state.vert=vertDef] Vertex `GLSL` code to prepend `macro`s.
 * @param {string[]} [state.verts] Preprocesses and caches vertex `GLSL`
 *   code per-pass if given, otherwise processes just-in-time before each pass.
 * @param {string} [state.frag] Fragment `GLSL` to prepend `macro`s.
 * @param {string[]} [state.frags] Preprocesses and caches fragment `GLSL`
 *   code per-pass, otherwise processes just-in-time before each pass.
 * @param {onStep} [onStep] Callback upon each step.
 * @param {onPass} [onPass] Callback upon each pass.
 * @param {object} [to=state] The `object` to set up. Modifies the given `state`
 *   `object` by default.
 *
 * @returns {object} `to` The given `to` `object`; set up with a `gpgpu` step
 *   `function` and related properties, to use with the `gpgpu` state.
 * @returns {string} `to.vert` The given/new `state.vert` vertex shader `GLSL`.
 * @returns {string} `to.frag` The given `state.frag` fragment shader `GLSL`.
 * @returns {string[]} `[to.verts]` Any cached pre-processed vertex shaders
 *   `GLSL`, if `state.verts` was given.
 * @returns {string[]} `[to.frags]` Any cached pre-processed fragment shaders
 *   `GLSL`, if `state.verts` was given.
 * @returns {object} `to.uniforms` The given `state.uniforms`.
 * @returns {number} `to.count` The given or new `state.count`.
 * @returns {buffer} `to.positions` The given or new `state.positions`; via
 *   `api.buffer`.
 * @returns {command} `to.pass` A `GL` command `function` to draw a given pass;
 *   via `api`/`api.command`.
 * @returns {function} `to.step` The main `function` to perform all the draw
 *   pass `GL` commands for a given state step.
 */
export function toStep(api, state = {}, to = state) {
  /** Handle `object`s or `regl`-like extended `function`s, for `command`. */
  const { buffer, clear, command = api } = api;

  const {
      merge, pipeline, verts, frag, frags, uniforms, attributes, maps,
      // Update any default vertex `shader` to use the given `pre`.
      pre: n = preDef, vert = vertDef.replaceAll(preDef, n || ''),
      // Any vertex `count`, and `positions` to be passed to `buffer`.
      count = countDef, positions = positionsDef(),
      clearPass = null
    } = state;

  // Ensure any properties changed are included.
  to.pre = n;
  to.vert = vert;
  to.count = count;
  to.positions = buffer(positions);
  to.clearPass = clearPass;

  // May pre-process and keep the `shader`s for all passes in advance.
  if(verts || frags) {
    // Keep the current pass.
    const { passNow } = state;

    verts && (to.verts = verts);
    frags && (to.frags = frags);

    each((pass, p) => {
        // Create `macro`s for this pass in advance.
        state.passNow = p;

        // Specify a `'vert'` type `shader` for any per-`shader` `macro` hooks.
        verts &&
          (verts[p] ??= macroPass(state, 'vert')+toShader(vert, null, state));

        // Specify a `'frag'` type `shader` for any per-`shader` `macro` hooks.
        frags &&
          (frags[p] ??= macroPass(state, 'frag')+toShader(frag, null, state));
      },
      maps.passes);

    // Set the pass back to what it was.
    state.passNow = passNow;
  }

  /** A `command` to render `pass` updates via a `GL` `pipeline` description. */
  to.pass = command(to.pipeline = {
    // Uses the full-screen vertex `shader` state by default.
    vert(c, s) {
      const { passNow: p, step: { vert: v = vert, verts: vs = verts } } = state;

      // Specify a `'vert'` type `shader` for any per-`shader` `macro` hooks.
      return vs?.[p] ?? macroPass(s, 'vert')+toShader(v, c, s);
    },
    frag(c, s) {
      const { passNow: p, step: { frag: f = frag, frags: fs = frags } } = state;

      // Specify a `'frag'` type `shader` for any per-`shader` `macro` hooks.
      return fs?.[p] ?? macroPass(s, 'frag')+toShader(f, c, s);
    },
    /** Need an active `pass` with `framebuffer`, or may draw to the screen. */
    framebuffer: (_, s) => getPass(s)?.framebuffer,
    count, uniforms,
    attributes: {
      [n+'position']: (_, s) => s.positions,
      ...attributes
    },
    depth: { enable: false },
    blend: { enable: false },
    /** Any `pipeline` properties shallow-override others of the same name. */
    ...pipeline
  });

  /** Any merged `texture`'s update, set up if not already given. */
  merge && ((to.merge = merge).update ??= updateMerge);

  /** Guard for number overflow; set to `0` to ignore or handle in `GLSL`. */
  to.stepBy = (state = to, by = 1) => {
    const { stepNow = 0, stepMax = stepMaxDef } = state;

    state.stepNow = wrap(stepNow+by, stepMax || Infinity);

    return state;
  };

  /** Executes the next step and all its passes. */
  to.step = (state = to) => {
    const stepState = state.onStep?.(state) ?? state;

    const {
        steps, merge, pass, onPass, stepBy,
        clearPass = stepState.clearPass = clearPassDef()
      } = stepState;

    const mergeUpdate = merge?.update;

    stepBy(stepState);

    each((p, i) => {
        stepState.passNow = i;

        const passState = onPass?.(stepState, p) ?? stepState;

        /** Only call `clear` if specified, can just use blending otherwise. */
        clearPass &&
          (clearPass.framebuffer = getPass(passState)?.framebuffer) &&
          clear(clearPass);

        pass(passState);
        // Update any merged `texture` upon each pass.
        mergeUpdate?.(passState);
      },
      stepState.maps.passes);

    delete clearPass?.framebuffer;

    return stepState;
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
 * - {@link toStep}
 * - {@link data.toData}
 * - {@link state.framebuffer}
 *
 * **Returns**
 * - A `stepState` object to use for each of the step's next passes; or
 *   `null`ish to use the given `props`.
 *
 * @param {object} [props] The `props` passed to `run`.
 * @param {framebuffer[]} step The `framebuffer`s for `props.stepNow` from
 *   `props.steps`, where the next state step will be drawn. See `toData`.
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
 * - {@link toStep}
 * - {@link maps.mapGroups}
 *
 * **Returns**
 * - A `passState` object to use for the render `command` call; or `null`ish to
 *   use the given `stepState`.
 *
 * @param {object} [stepState] The `props` passed to `run` via any `onStep`.
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
  let f = next?.framebuffer;

  /** Handle `object`s or `regl`-like extended `function`s. */
  (f.call !== call) && (f = f?.call);

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

export default toStep;
