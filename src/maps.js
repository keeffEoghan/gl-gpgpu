/**
 * The `gpgpu` maps of data for optimal inputs/outputs on a platform.
 *
 * These maps show how to make optimal use of a platform's supported features,
 * how to pack/unpack their data from `framebuffer`s/`texture`s, perform minimal
 * needed samples to retrieve any past values they must derive from, etc.
 *
 * Shaders may declare values they output, values they derive from, groupings of
 * in/dependent values - without handling how these concerns map to the
 * particular platform resources they're using.
 *
 * Platform limits/features/extensions are accounted for, to produce the most
 * efficient mappings available with the least I/O when it comes to drawing
 * (draw passes, `texture` samples, etc).
 *
 * @module
 * @category JS
 *
 * @todo Allow passes within/across `texture`s; separate data/`texture` shapes.
 */

import map from '@epok.tech/fn-lists/map';
import reduce from '@epok.tech/fn-lists/reduce';
import each from '@epok.tech/fn-lists/each';

import { valuesDef, channelsMaxDef, buffersMaxDef } from './const';

const { isInteger } = Number;
const { isArray } = Array;

/**
 * Determines whether a given value is valid and can be stored within the
 * channels available.
 *
 * @param {number} value A value to validate.
 * @param {number} [channelsMax] The maximum channels available to store values.
 *
 * @returns {boolean} Whether the given `value` is valid.
 */
export const validValue = (value, channelsMax = channelsMaxDef) =>
  ((1 <= value) || (value <= channelsMax) ||
    !!console.error(`\`gl-gpgpu\`: the given value (${value}) exceeds the `+
      `range of channels available, \`[1, ${channelsMax}]\` inclusive.`,
      value, channelsMax));

/**
 * Whether to use buffers to output state `values` in passes per-step, or no
 * output buffers in one pass as a side-effect not updating state `values`.
 *
 * @param {number|false} buffersMax Maximum `texture`s that may be bound as
 *   buffer outputs per-pass.
 *
 * @returns {boolean} Whether to use output buffers in passes, or no output
 *   buffers in one pass.
 */
export const useBuffers = (buffersMax) =>
  isInteger(buffersMax) && (0 < buffersMax) && (buffersMax < Infinity);

/**
 * Minimise resource usage, order `values` to pack into blocks of `channelsMax`;
 * interpreted as indexes into the given `values`.
 *
 * @see {@link mapGroups}
 *
 * @example ```
 *   packValues([1, 2, 3], 4, []); // =>
 *   [2, 0, 1];
 *
 *   packValues([3, 2, 1], 4, []); // =>
 *   [0, 2, 1];
 *
 *   packValues([4, 3, 2], 4, []); // =>
 *   [0, 1, 2];
 *
 *   packValues([1, 1, 4, 2], 4, []); // =>
 *   [2, 3, 0, 1];
 * ```
 *
 * @param {array.<number>} values Each entry is how many interdependent channels
 *   are grouped into one texture in one pass, separate entries may be across
 *   one or more textures/passes. See `mapGroups`.
 * @param {number} [channelsMax=channelsMaxDef] The maximum number of channels
 *   per texture. See `mapGroups`.
 * @param {array} [to=[]] An `array` to store the result; a new `array` if not
 *   given.
 *
 * @returns {array.<number>} `to` The indexes of the given `values`, reordered
 *   to pack into the fewest buckets of `channelsMax` size or less; stored in
 *   the given `to` array.
 */
export function packValues(values, channelsMax = channelsMaxDef, to = []) {
  // Fill `to` with indexes of `values`, and ensure it's the same length.
  map((_, i) => i, values, to).length = values.length;

  /** Counts the number of empty channels in the current group. */
  let channels = channelsMax;
  /** How many values have already been packed. */
  let packed = 0;
  /** Tracks the value that best fits the free channels (fills it tightest). */
  let fitIndex = 0;
  let fitSize = Infinity;

  for(let i = 0; packed < values.length;) {
    const v = packed+i;
    const value = values[to[v]];

    if(!validValue(value, channelsMax)) { return to; }

    // Check how value fits the channels - valid is >= 0, perfect is 0.
    const fit = channels-value;

    if((fit >= 0) && (fit < fitSize)) {
      fitSize = fit;
      fitIndex = v;
    }

    // Not a perfect fit and can keep searching for better fits - continue.
    if((fitSize !== 0) && (v < values.length-1)) { ++i; }
    else {
      // Got a perfect fit or the search ended - swap in best fit value.
      const pack = to[fitIndex];

      to[fitIndex] = to[packed];
      to[packed] = pack;

      // Reduce the free channels by the best value, reset if needed.
      ((channels -= values[pack]) > 0) || (channels = channelsMax);
      // Start the search again over the remaining unpacked entries.
      fitIndex = ++packed;
      fitSize = Infinity;
      i = 0;
    }
  }

  return to;
}

/**
 * Groups the `values` of `gpgpu` data across draw passes and data textures.
 *
 * @see {@link packValues}
 * @see {@link data.toData}
 *
 * @example ```
 *   const x = 2;
 *   const y = 4;
 *   const z = 1;
 *   const maps = { values: [x, y, z], channelsMax: 4 };
 *
 *   // No optimisations - values not packed, single texture output per pass.
 *   mapGroups({ ...maps, buffersMax: 1, packed: false }); // =>
 *   {
 *     ...maps, packed: false,
 *     textures: [[0], [1], [2]], // length === 3
 *     passes: [[0], [1], [2]], // length === 3
 *     valueToTexture: [0, 1, 2], valueToPass: [0, 1, 2],
 *     textureToPass: [0, 1, 2]
 *   };
 *
 *   // Automatically packed values - values across fewer textures/passes.
 *   mapGroups({ ...maps, buffersMax: 1 }); // =>
 *   {
 *     ...maps, packed: [1, 0, 2],
 *     textures: [[1], [0, 2]], // length === 2
 *     passes: [[0], [1]], // length === 2
 *     valueToTexture: [1, 0, 1], valueToPass: [1, 0, 1],
 *     textureToPass: [0, 1]
 *   };
 *
 *   // Can bind more texture outputs per pass - values across fewer passes.
 *   mapGroups({ ...maps, buffersMax: 4 }); // =>
 *   {
 *     ...maps, packed: [1, 0, 2],
 *     textures: [[1], [0, 2]], // length === 2
 *     passes: [[0, 1]], // length === 1
 *     valueToTexture: [1, 0, 1], valueToPass: [0, 0, 0],
 *     textureToPass: [0, 0]
 *   };
 *
 *   // Custom packed values - fuller control.
 *   mapGroups({ ...maps, buffersMax: 4, packed: [0, 2, 1] }); // =>
 *   {
 *     ...maps, packed: [0, 2, 1],
 *     textures: [[0, 2], [1]], // length === 2
 *     passes: [[0, 1]], // length === 1
 *     valueToTexture: [0, 1, 0], valueToPass: [0, 0, 0],
 *     textureToPass: [0, 0]
 *   };
 *
 *   // Merge dependent values - fuller control, but no map for merged values.
 *   mapGroups({ ...maps, values: [x+z, y], buffersMax: 4 }); // =>
 *   {
 *     ...maps, packed: [1, 0],
 *     textures: [[1], [0]], // length === 2
 *     passes: [[0, 1]], // length === 1
 *     valueToTexture: [1, 0], valueToPass: [0, 0],
 *     textureToPass: [0, 0]
 *   };
 * ```
 *
 * @param {object} [maps=\{\}] Initial maps settings; new `object` if not given.
 *
 * @param {array.<number>} [maps.values=valuesDef()] An `array` where each
 *   `number` denotes how many value channels are grouped into one data-texture
 *   in one draw pass (where any value map logic isn't handled here); each
 *   separate number may be computed across one or more data-textures/passes.
 *
 *   Each value denotes the number of dependent channels to compute together;
 *   separate values denote channels that are independent, and may be drawn in
 *   the same or separate passes, depending on settings/support.
 *
 *   The order may affect the number of textures/passes needed; can maintain
 *   order as-is, or use a more efficient `packed` order. See `packValues`.
 *
 * @param {number} [maps.channelsMax=channelsMaxDef] Maximum channels
 *   per-`texture`.
 * @param {number|false} [maps.buffersMax=buffersMaxDef] Maximum `texture`s that
 *   may be bound as buffer outputs per-pass. Maps multiple passes per-step to
 *   output all `values` if they're spread across more `textures` than this
 *   `number`. Uses one pass and binds no output if given `false`y; useful for
 *   side-effects with no state outputs, like rendering. See `toData`.
 * @param {array.<number>} [maps.packed] An `array` of indexes into `values`
 *   packed into an order that best fits into blocks of `channelsMax` to
 *   minimise resources; or `false`y to use `values` in their given order; uses
 *   `packValues` if not given.
 * @param {object} [to=maps] An `object` to contain the results; modifies `maps`
 *   if not given.
 *
 * @returns {object} `to` The given `to` `object`; how `values` are grouped
 *   per-texture per-pass per-step, meta information, and given parameters.
 * @returns {array.<array.<number>>} `to.passes` Textures grouped into passes,
 *   as `arrays` corresponding to `framebuffer`s in separate draw passes; whose
 *   values are indexes into `to.textures`.
 * @returns {array.<array.<number>>} `to.textures` Values grouped into
 *   textures, as `array`s corresponding to `framebuffer` attachments, into
 *   which `values` are drawn; whose values are indexes into `to.values`.
 * @returns {array.<number>} `to.values` The `values`, as given.
 * @returns {number} `to.buffersMax` Maximum `texture`s that may be bound as
 *   buffer outputs per-pass, as given.
 * @returns {number} `to.channelsMax` Maximum channels per-`texture`, as given.
 * @returns {array.<number>} `to.valueToTexture` Inverse map from each index of
 *   `to.values` to the index of the data-texture containing it.
 * @returns {array.<number>} `to.valueToPass` Inverse map from each index of
 *   `to.values` to the index of the pass containing it.
 * @returns {array.<number>} `to.textureToPass` Inverse map from each index of
 *   `to.textures` to the index of the pass containing it.
 */
export function mapGroups(maps = {}, to = maps) {
  const {
      values = valuesDef(),
      buffersMax = buffersMaxDef, channelsMax = channelsMaxDef,
      // Pack `values` into blocks of `channelsMax` to minimise resources.
      packed = packValues(values, channelsMax)
    } = maps;

  // Ensure any properties changed are included.
  to.values = values;
  to.buffersMax = buffersMax;
  to.channelsMax = channelsMax;
  to.packed = packed;

  const passes = to.passes = [[]];
  const textures = to.textures = [[]];
  const valueToTexture = to.valueToTexture = [];
  const valueToPass = to.valueToPass = [];
  const textureToPass = to.textureToPass = [];

  /** Whether to use output buffers in passes, or no buffers in one pass. */
  const output = !!buffersMax;
  /** Counts the number of channels written in a single draw pass. */
  let channels = 0;
  /** Get the index, via any `packed`, from `values`. */
  const getIndex = ((packed)? ((i) => packed[i]) : ((i) => i));
  /** Get the value, via any `packed`, from `values`. */
  const getValue = ((packed)? ((_, i) => values[i]) : ((v) => v));

  return reduce((to, v, i) => {
      const index = getIndex(i);
      const value = getValue(v, index);

      if(!validValue(value, channelsMax)) { return to; }

      let p = passes.length-1;
      let pass = passes[p];
      let t = textures.length-1;
      let texture = textures[t];

      if((channels += value) > channelsMax) {
        channels = value;
        t = textures.push(texture = [])-1;
        output && (pass.length >= buffersMax) && (p = passes.push(pass = [])-1);
        pass.push(t);
        textureToPass.push(p);
      }
      else if(pass.length === 0) {
        pass.push(t);
        textureToPass.push(p);
      }

      texture.push(index);
      valueToTexture[index] = t;
      valueToPass[index] = p;

      return to;
    },
    values, to);
}

/**
 * Maps the minimal set of texture reads to derive the next state of values from
 * a past state of values they depend upon.
 *
 * @see {@link mapGroups}
 *
 * @example ```
 *   const maps = mapGroups({
 *     // See `mapGroups` examples for resulting maps.
 *     values: [2, 4, 1], channelsMax: 4, buffersMax: 1, packed: false,
 *     // Derived step/value indexes, per-value; sample entries include:
 *     derives: [
 *       // Single...
 *       2,
 *       // Empty...
 *       ,
 *       // Multiple...
 *       [
 *         // Defined step...
 *         { value: 1, step: 0 },
 *         // All values at any given level/step...
 *         true
 *       ]
 *     ]
 *   });
 *
 *   mapSamples(maps); // =>
 *   {
 *     ...maps,
 *     // Minimum texture samples for values; nested per-pass, per-value.
 *     // Deepest arrays are step/texture index pairs into `maps.textures`.
 *     samples: [
 *       [[0, 2]],
 *       null,
 *       [[1, 0], [0, 0], [0, 1], [0, 2]]
 *     ],
 *     // Value indexes into `to.samples`; nested per-pass, per-value.
 *     // Map from a value index to data it needs in the minimal samples.
 *     reads: [
 *       [[0]],
 *       null,
 *       [null, null, [0, 1, 2, 3]]
 *     ]
 *   };
 * ```
 *
 * @param {object} maps How values are grouped per-`texture` per-pass per-step.
 *   See `mapGroups`.
 *
 * @param {derives} [maps.derives] How the next output state `values` derive
 *   from any past input `values`. If given no `derives`, or a
 *   `false`y-non-integer, no samples are mapped, `to` is returned unchanged.
 *
 * @param {array.<array.<number>>} maps.passes Textures grouped into passes. See
 *   `mapGroups`.
 * @param {array.<array.<number>>} maps.textures Values grouped into textures. See
 *   `mapGroups`.
 * @param {array.<number>} maps.valueToTexture Inverse map from each value index
 *   to the data texture index containing it.
 * @param {object} [to=maps] The object to store the result in; `maps` if not
 *   given.
 *
 * @returns {object} `to` The given `to` object, with resulting maps added for
 *   any given `maps.derives`.
 * @returns {array.<array.<array.<number>>>} `[to.samples]` Map of the minimum
 *   set of indexes into `maps.textures` that need to be sampled per-pass,
 *   to get all `derives` needed for each value of `maps.values` of each
 *   pass of `maps.passes`.
 * @returns {array.<array.<array.<number>>>} `[to.reads]` Sparse map from
 *   each value of `derives` to its step and texture indexes in `to.samples`.
 * @returns {derives} `[to.derives]` How new values derive from past values, as
 *   given.
 */
export function mapSamples(maps = {}, to = maps) {
  const { derives, passes, textures, valueToTexture } = maps;

  if(!derives && (derives !== 0)) { return to; }

  const reads = to.reads = [];
  const readsToValue = to.readsToValue = [];
  const cache = {};

  const allStepSamples = (step) =>
    cache[step] ??= map((t, value) => ({ step, value }), valueToTexture);

  const getAddSample = (pass, valueNext) => function add(set, derive, d) {
    /** The past step to derive from. */
    let step = 0;
    /** The past value to derive from. */
    let dp = derive;

    // Derive from any specified `value` and `step` nested properties.
    (derives !== true) && !isInteger(derives) &&
      ({ value: dp = dp, step = step } = derive);

    // Derive from all samples at the given or most recent step if given `true`.
    if(dp === true) { return reduce(add, allStepSamples(step), set); }

    // Derive from the given sample.
    const texture = valueToTexture[dp];

    if(!(isInteger(step) && isInteger(texture))) {
      return console.error('`mapSamples`: invalid map for sample',
        derives, maps, pass, valueNext, derive, d, step, texture, dp);
    }

    // Create the set if not already created.
    const to = (set || []);
    // Check for any existing matching step/texture read in the set.
    const i = to.findIndex(([s, t]) => (s === step) && (t === texture));

    // Add the read for this next value in this pass; creating any needed maps.
    ((reads[pass] ??= [])[valueNext] ??= [])
      // A new read as needed, or any existing matching read.
      .push((i < 0)? to.push([step, texture])-1 : i);

    // Add a reverse lookup from read index to value index.
    ((readsToValue[pass] ??= [])[valueNext] ??= []).push(dp);

    return to;
  };

  const getAddSamples = (pass) => (set, valueNext) => {
    /** Derive next output value from any given past input values. */
    const dn = ((isArray(derives))? derives[valueNext] : derives);

    return (((!dn && (dn !== 0))? set
      : (((dn !== derives) && isArray(dn))?
        reduce(getAddSample(pass, valueNext), dn, set)
      : getAddSample(pass, valueNext)(set, dn))));
  }

  to.samples = map((pass, p) => reduce((set, texture) =>
        reduce(getAddSamples(p), textures[texture], set),
      pass, null),
    passes, []);

  return to;
}

/**
 * Maps a full step, creates maps grouping given values per-`texture` per-pass
 * per-step, and minimal samples and reads if new values derive from past ones.
 *
 * @see {@link mapGroups}
 * @see {@link mapSamples}
 *
 * @param {object} [maps] Input value maps and settings.
 * @param {object} [to=maps] An `object` to contain the results; modifies `maps`
 *   if not given.
 *
 * @returns {object} `to` The given `to` object; how `values` are grouped
 *   per-`texture` per-pass per-step, meta information, and given parameters;
 *   and minimal samples and reads for any given `maps.derives`.
 */
export const mapStep = (maps, to = maps) => mapSamples(mapGroups(maps, to), to);

/**
 * @typedef {derive|array.<derive|array.<derive>>>} derives
 * Denotes how next output `values` derive from any past input `values`.
 *
 * A nested hierarchy of the form
 * `all-next-from-past[any-next-from-past[any-next-from-any-past]]`; each
 * nesting level denotes how to derive:
 * 0. `all-next-from-past`: to all next `values`, from one/all past `value`/s.
 * 1. `any-next-from-past`: to any given next `values` (by sparse `array`
 *   indexes in `values` order), from one/all past `value`/s.
 * 2. `any-next-from-any-past`: to any given next `values` (by its `array` index
 *   in parent level 1), from any past `value`/s in this level 2 `array`.
 *
 * The `array`s are sparse, with empty or `false`y-non-integer entries ignored.
 *
 * See `derive` for how to denote past input `values`.
 *
 * **See**
 *
 * - {@link derive}
 */

/**
 * @typedef {true|number|{value:true|number,step?:number}} derive
 * Denotes any past input `values` (and optional past `step`), that next output
 * `values` derive from.
 *
 * A nested hierarchy of the form `any-value-past[any-value-step-past]`,
 * indexing `values`, each nesting level denotes how to derive from:
 * 0. `any-value-past`: any/all past input `value`/s, at 1st `step` past.
 * 1. `any-value-step-past`: any/all past input `value`/s, at any given `step`
 *   past.
 *
 * The `value`/s to derive from may be given as:
 * - `true`: derives from all `values`.
 * - `number`: derives from the given `values` index.
 *
 * If given a `true` or `number` (denoting `value`/s but no `step`), the next
 * output `value` derives from the given `values` at the 1st `step` past.
 *
 * To specify a different `step`, pass an `object` denoting both the `value` (as
 * above) along with a `step`; in the form `{value:true|number,step?:number}`,
 * to derive from the `value` at any given `step` past (or the 1st `step` past
 * if not given).
 *
 * Any omitted `values` are ignored.
 *
 * See `derives` for more on how these are derived by the next output `values`.
 *
 * **See**
 *
 * - {@link derives}
 */

export default mapStep;
