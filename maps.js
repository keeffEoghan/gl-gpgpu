/**
 * GPGPU mappings for step/draw shaders input/output.
 *
 * These maps show shaders how to make use of a system's supported features, how
 * to pack/unpack their data from framebuffers/textures, perform only minimal
 * needed samples to retrieve any past values they must derive from, etc.
 *
 * Shaders may declare values they output, values they derive from, groupings of
 * in/dependent values - without handling how these concerns map to the
 * particular system resources they're using.
 *
 * System limits/features/extensions are accounted for, to produce the most
 * efficient mappings available with the least I/O when it comes to drawing
 * (draw passes, texture samples, etc).
 *
 * @module
 *
 * @todo Allow passes within/across textures; separate data and texture shapes.
 */

import map from '@epok.tech/fn-lists/map';
import reduce from '@epok.tech/fn-lists/reduce';
import each from '@epok.tech/fn-lists/each';

import { valuesDef, channelsMaxDef, buffersMaxDef } from './const';

const { isInteger } = Number;

/** Cache for optimisation. */
export const cache = { packed: [] };

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
 * @param {array<number>} values Each entry is how many interdependent channels
 *   are grouped into one texture in one pass, separate entries may be across
 *   one or more textures/passes. See `mapGroups`.
 * @param {number} [channelsMax=channelsMaxDef] The maximum number of channels
 *   per texture. See `mapGroups`.
 * @param {array} [to=[]] An array to store the result; a new array by default.
 *
 * @returns {array<number>} `to` The indexes of the given `values`, reordered to
 *   pack into the fewest buckets of `channelsMax` size or less; stored in the
 *   given `to` array.
 */
export function packValues(values, channelsMax = channelsMaxDef, to = []) {
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
 * Groups the `values` of GPGPU data items across draw passes and data textures.
 *
 * @see {@link maps.packValues}
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
 * @param {object} [maps={}] Maps and initial settings; new object if not given.
 *
 * @param {array<number>} [maps.values=valuesDef()] An array where each number
 *   denotes how many value channels are grouped into one data texture in one
 *   draw pass (where any value map logic isn't handled here); each separate
 *   number may be computed across one or more data textures/passes.
 *
 *   Each value denotes the number of dependent channels to compute together;
 *   separate values denote channels that are independent, and may be drawn in
 *   the same or separate passes, depending on settings/support.
 *
 *   The order may affect the number of passes/textures needed; can maintain
 *   order as-is, or use a more efficient `packed` order. See `packValues`.
 *
 * @param {number} [maps.channelsMax=channelsMaxDef] Maximum channels per
 *   texture.
 * @param {number} [maps.buffersMax=buffersMaxDef] Maximum textures bound per
 *   pass.
 * @param {array<number>|false} [maps.packed] An array of indexes into `values`
 *   packed into an order that best fits into blocks of `channelsMax` to
 *   minimise resources; or false-y to use `values` in their given order;
 *   uses `packValues` if not given.
 * @param {object} [to=maps] An object to contain the results; modifies `maps`
 *   if not given.
 *
 * @returns {object} `to` The given `to` object; how `values` are grouped
 *   per-texture per-pass per-step, meta information, and given parameters.
 * @returns {array<array<number>>} `to.passes` Textures grouped into passes, as
 *   arrays corresponding to framebuffers in separate draw passes; whose
 *   values are indexes into `to.textures`.
 * @returns {array<array<number>>} `to.textures` Values grouped into
 *   textures, as arrays corresponding to framebuffer attachments, into which
 *   `values` are drawn; whose values are indexes into `to.values`.
 * @returns {array<number>} `to.values` The `values`, as given.
 * @returns {number} `to.buffersMax` The max textures per pass, as given.
 * @returns {number} `to.channelsMax` The max channels per texture, as given.
 * @returns {array<number>} `to.valueToTexture` Inverse map from each index of
 *   `to.values` to the index of the data texture containing it.
 * @returns {array<number>} `to.valueToPass` Inverse map from each index of
 *   `to.values` to the index of the pass containing it.
 * @returns {array<number>} `to.textureToPass` Inverse map from each index of
 *   `to.textures` to the index of the pass containing it.
 */
export function mapGroups(maps = {}, to = maps) {
  if(!maps) { return to; }

  const {
      values = valuesDef(),
      channelsMax = channelsMaxDef, buffersMax = buffersMaxDef,
      // Pack `values` into blocks of `channelsMax` to minimise resources.
      packed = packValues(values, channelsMax, cache.packed)
    } = maps;

  to.values = values;
  to.buffersMax = buffersMax;
  to.channelsMax = channelsMax;
  to.packed = packed;

  const passes = to.passes = [[]];
  const textures = to.textures = [[]];
  const valueToTexture = to.valueToTexture = [];
  const valueToPass = to.valueToPass = [];
  const textureToPass = to.textureToPass = [];
  // Counts the number of channels written in a single draw pass.
  let channels = 0;
  // Get the value, via `packed` if valid, or directly as given in `values`.
  const getValue = ((packed)? ((_, i) => values[i]) : ((v) => v));
  const getIndex = ((packed)? ((i) => packed[i]) : ((i) => i));

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
        (pass.length >= buffersMax) && (p = passes.push(pass = [])-1);
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
 * @see {@link maps.mapGroups}
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
 *         [1, 0],
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
 * @param {object} maps How values are grouped per-texture, per-pass, per-step.
 *   See `mapGroups`.
 * @param {true|array} [maps.derives] How `values` map to any past `values` they
 *   derive from. If given falsey, creates no maps to derive values; .
 * @param {true|number|array} [maps.derives.[]] L1
 * @param {true|number|array} [maps.derives.[].[]] L2
 * @param {true|number} [maps.derives.[].[].[]] L3
 *
 * @param {true|array<true,number,array<true,number,array<true,number>>>} [maps.derives]
 *   How values derive from past values.
 *
 *   If given as a sparse array, each entry relates the corresponding value to
 *   any past value steps/indexes it derives from - a value not derived from
 *   past values may have an empty/null entry; a value derives from past
 *   values where its entry has:
 *   - Numbers; deriving from the most recent state at the given value index.
 *   - Lists of numbers; deriving from the given past state index (1st number
 *     denotes how many steps ago), at the given value index (2nd number).
 *
 *   The nested hierarchy thus has any `pass,[values,[value,[step, value]]]`.
 *   If any level is given as `true`, maps to sample all values, at the given
 *   step (or most recent step, if none given).
 *
 *   If no `derives` given, no samples are mapped, `to` is returned unchanged.
 *
 * @param {array<array<number>>} maps.passes Textures grouped into passes. See
 *   `mapGroups`.
 * @param {array<array<number>>} maps.textures Values grouped into textures. See
 *   `mapGroups`.
 * @param {array<number>} maps.valueToTexture Inverse map from each value index
 *   to the data texture index containing it.
 * @param {object} [to=maps] The object to store the result in; `maps` if not
 *   given.
 *
 * @returns {object} `to` The given `to` object, with resulting maps added for
 *   any given `maps.derives`.
 * @returns {array<array<array<number>>>} `[to.samples]` Map of the minimum
 *   set of indexes into `maps.textures` that need to be sampled per-pass,
 *   to get all `derives` needed for each value of `maps.values` of each
 *   pass of `maps.passes`.
 * @returns {array<array<array<number>>>} `[to.reads]` Sparse map from
 *   each value of `derives` to its step and texture indexes in `to.samples`.
 * @returns {true|array<true,number,array<true,number,array<true,number>>>}
 *   `[to.derives]` How values derive from past values, as given.
 */
export function mapSamples(maps, to = maps) {
  const derives = maps?.derives;

  if(!derives) { return to; }

  const { passes, textures, valueToTexture } = maps;
  const reads = to.reads = [];
  const cache = {};

  to.derives = derives;

  const all = (step = 0) =>
    cache[step] ??= map((t, v) => [step, v], valueToTexture);

  const getAddSample = (pass, value) => function add(set, derive, d) {
    let step = 0;
    let texture;

    if(derive === true) { return reduce(add, all(step), set); }
    else if(isInteger(derive)) { texture = valueToTexture[derive]; }
    else if(derive[1] === true) { return reduce(add, all(derive[0]), set); }
    else {
      step = derive[0];
      texture = valueToTexture[derive[1]];
    }

    if(!(isInteger(step) && isInteger(texture))) {
      return console.error('`mapSamples`: invalid map for sample',
        derives, maps, pass, value, derive, d, step, texture);
    }

    // Create the set if not already created.
    const to = (set || []);
    // Check for any existing matching step/texture read in the set.
    const i = to.findIndex(([s, t]) => (s === step) && (t === texture));

    // Add the read for this value in this pass; creating any needed maps.
    ((reads[pass] ??= [])[value] ??= [])
      // A new read as needed, or any existing matching read.
      .push((i < 0)? to.push([step, texture])-1 : i);

    return to;
  };

  const getAddSamples = (pass) => (set, value) => {
    const valueDerives = ((derives === true)? derives : derives[value]);

    return ((!valueDerives && (valueDerives !== 0))? set
      : (((valueDerives === true) || isInteger(valueDerives))?
        getAddSample(pass, value)(set, valueDerives)
      : reduce(getAddSample(pass, value), valueDerives, set)));
  }

  to.samples = map((pass, p) => reduce((set, texture) =>
        reduce(getAddSamples(p), textures[texture], set),
      pass, null),
    passes, []);

  return to;
}

/**
 * Main function, creates maps for a given set of values and settings, as well
 * as maps for minimal samples and reads if new values derive from past ones.
 *
 * @see {@link maps.mapGroups}
 * @see {@link maps.mapSamples}
 *
 * @param {object} [maps] Maps and initial settings.
 * @param {object} [to=maps] An object to contain the results; modifies `maps`
 *   if not given.
 *
 * @returns {object} `to` The given `to` object; how `values` are grouped
 *   per-texture per-pass per-step, meta information, and given parameters;
 *   and minimal samples and reads for any given `maps.derives`.
 */
export const mapFlow = (maps, to = maps) =>
  mapSamples(maps, mapGroups(maps, to));

export default mapFlow;
