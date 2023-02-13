/** Demo implementation of 3D particle Verlet/Euler integration simulation. */

import getRegl from 'regl';
import { clamp } from '@thi.ng/math/interval';
import { mix } from '@thi.ng/math/mix';
import { fit, fitClamped } from '@thi.ng/math/fit';
import { identity44 } from '@thi.ng/matrices/identity';
import { rotationAroundAxis44 } from '@thi.ng/matrices/rotation-around-axis';
import { perspective } from '@thi.ng/matrices/perspective';
import { lookAt } from '@thi.ng/matrices/lookat';
import { concat } from '@thi.ng/matrices/concat';
import { mulM44 } from '@thi.ng/matrices/mulm';
import { mulV344 } from '@thi.ng/matrices/mulv';
import { invert44 } from '@thi.ng/matrices/invert';
import { mulN2 } from '@thi.ng/vectors/muln';
import { div2 } from '@thi.ng/vectors/div';
import { divN2 } from '@thi.ng/vectors/divn';
import { sub3 } from '@thi.ng/vectors/sub';
import { add3 } from '@thi.ng/vectors/add';
import { invert2 } from '@thi.ng/vectors/invert';
import { setC2, setC3 } from '@thi.ng/vectors/setc';
import { dist3 } from '@thi.ng/vectors/dist';
import { normalize3 } from '@thi.ng/vectors/normalize';
import timer from '@epok.tech/fn-time';
import reduce from '@epok.tech/fn-lists/reduce';
import map from '@epok.tech/fn-lists/map';
import each from '@epok.tech/fn-lists/each';
import range from '@epok.tech/fn-lists/range';
import wrap from '@epok.tech/fn-lists/wrap';

import gpgpu from '../../src';

import { extensionsFloat, extensionsHalfFloat, optionalExtensions }
  from '../../src/const';

import { macroPass } from '../../src/macros';
import { mapStep } from '../../src/maps';
import { toUniforms } from '../../src/uniforms';
import { getDrawIndexes } from '../../src/size';
import indexForms from '../../src/index-forms';

import stepFrag from './step.frag.glsl';
import drawVert from './draw.vert.glsl';
import drawFrag from './draw.frag.glsl';

const { abs, floor, random, sin, cos, min, max, sqrt, log2, PI: pi } = Math;
const tau = pi*2;

self.gpgpu = gpgpu;
self.macroPass = macroPass;
self.mapStep = mapStep;
self.toUniforms = toUniforms;
self.getDrawIndexes = getDrawIndexes;
self.indexForms = indexForms;

const canvas = document.querySelector('canvas');

// Scroll to the top.
const scroll = () => setTimeout(() => canvas.scrollIntoView(true), 0);

scroll();

function toggleError(e) {
  canvas.classList[(e)? 'add' : 'remove']('hide');
  document.querySelector('.error').classList[(e)? 'remove' : 'add']('hide');
  document.querySelector('aside').classList[(e)? 'add' : 'remove']('show');
  scroll();
}

toggleError();

// Handle query parameters.

const getQuery = (search = location.search) => new URLSearchParams(search);

function setQuery(entries, q = getQuery()) {
  entries &&
    each(([k, v = null]) => ((v === null)? q.delete(k) : q.set(k, v)), entries);

  return q;
}

const query = getQuery();

// Check for any extensions that need to be applied.
const fragDepth = query.get('depth') === 'frag';

// Set up GL.

const extend = {
  required: extensionsHalfFloat,
  optional: ((fragDepth)?
      [...extensionsFloat, ...optionalExtensions, 'ext_frag_depth']
    : [...extensionsFloat, ...optionalExtensions])
};

const pixelRatio = max(devicePixelRatio, 1.5) || 1.5;

const regl = self.regl = getRegl({
  canvas, pixelRatio,
  extensions: extend.required, optionalExtensions: extend.optional,
  onDone: toggleError
});

console.group('Extensions');

console.log('required',
  (extend.required &&
    reduce((o, e) => o+(o && '; ')+e+': '+regl.hasExtension(e),
      extend.required, '')));

console.log('optional',
  (extend.optional &&
    reduce((o, e) => o+(o && '; ')+e+': '+regl.hasExtension(e),
      extend.optional, '')));

console.groupEnd();

/**
 * How many state values (channels) are tracked independently of others.
 * The order here is the order used in the shaders and generated macros, but for
 * optimal lookups may be `packed` into channels/textures/passes differently.
 */
const valuesMap = (new Map())
  // Position, uses 3 channels.
  .set('position', 3)
  // Motion, uses 3 channels.
  .set('motion', 3)
  // Life, uses 1 channel.
  .set('life', 1);

const values = [];
const valuesIndex = {};

valuesMap.forEach((v, k) => valuesIndex[k] = values.push(v)-1);
console.log(values, '`values`');

/** Limits of this device and these `values`. */
const {
    maxTextureUnits, maxTextureSize, lineWidthDims, pointSizeDims, depthBits
  } = regl.limits;

/**
 * Whether to merge states into one texture; separate textures if not given.
 * Merge by default for maximum platform compatibility.
 *
 * @todo These should work:
 * ```
 *   merge = ((merge)? (merge !== 'false') : (stepsPast > 1));
 *   merge = ((merge)? (merge !== 'false') : (form !== 1));
 * ```
 */
const merge = query.get('merge') !== 'false';

/**
 * Better stay farther under maximum texture size, for errors/crashes.
 *
 * @todo Drawing issues with `scale` and `steps` both over 10.
 */
const limits = { scale: [0, log2(maxTextureSize)] };

/** A scale that seems to work well from experimentation with `GL` limits. */
const niceScale = clamp(8, ...limits.scale);

/** The data entries scale, from user input or default best-guess. */
const scale = clamp((parseFloat(query.get('scale') || niceScale, 10) || 0),
  ...limits.scale);

/** How many steps are used for output. */
const bound = 1;

/** The steps of state to track. */
limits.steps = [
  1+bound,
  // Maximum steps must fit the maximum total texture size if merging.
  floor((merge)? maxTextureSize/(2**scale)
    // Maximum steps must fit the maximum total texture units if separate.
    : (maxTextureUnits-bound)/reduce((s, v) => s+v, values)*4)
];

console.log('limits', limits, regl.limits);

/**
 * 2 active states, as many others as can be bound; at least 2 past states
 * needed for Verlet integration, 1 for Euler integration.
 */
const steps = floor(clamp(parseFloat(query.get('steps'), 10) || 2+bound,
  ...limits.steps));

/** How many past steps (not bound to outputs) are in the GPGPU state. */
const stepsPast = steps-bound;
/** Whether to allow Verlet integration; within available resource limits. */
const canVerlet = stepsPast > 1;

/** Whether to prefill initial states before spawning, or start with all `0`. */
const prefill = query.get('prefill') !== 'false';

/**
 * Form vertexes to draw; if not given, uses trails of 'lines' if there are
 * enough steps, or 'points' if not.
 */
const form = floor(parseFloat(query.get('form'), 10) || 0);

/** How wide the form is; to be scaled by `viewScale`. */
const wide = parseFloat(query.get('wide') || 1e-3*pixelRatio, 10) || 0;

/** The amount to spin the scene initially. */
const spin0 = parseFloat(query.get('spin-0') || 1e-2*pi, 10) || 0;
/** The pace to spin the scene each frame. */
const spinPace = parseFloat(query.get('spin-pace') || 5e-5, 10) || 0;

/** How much to scale the spout speeds. */
const spoutPace = parseFloat(query.get('spout-pace') || 1, 10) || 0;
/** Offset on the z-axis from the origin to the source. */
const gapZ = parseFloat(query.get('gap-z') || 0.15, 10) || 0;
/** How much to shake the source around while idling. */
const shakeSource = parseFloat(query.get('shake-source') || 1e-4, 10) || 0;
/** How much to shake the sink around while idling. */
const shakeSink = parseFloat(query.get('shake-sink') || 4e-2, 10) || 0;

/** How many older state positions to fizz around, and other inputs. */
const fizz = {
  at: parseFloat(query.get('fizz') || clamp(steps, 5, 2e2), 10) || 0,
  max: parseFloat(query.get('fizz-max') || fitClamped(steps, 5, 20, 2e-3, 4e-3),
    10) || 0,
  rate: parseFloat(query.get('fizz-rate') || 5e-4, 10) || 0,
  curve: parseFloat(query.get('fizz-curve') || 1.7, 10) || 0
};

/** Hue range between 2 values. */
const hues = query.getAll('hue');

// Parse any present hues, fill any missing hues, using only up to 2 hues.
map((h, i) => parseFloat(h || ((i)? hues[i-1]+(60/360) : 0), 10) || 0,
  range(hues, null, hues.length, hues.length = 2), 0);

/** Use lights, dark, or unlit. */
const lit = query.get('lit');
/** How much particle speed lights them up. */
const paceLit = parseFloat(query.get('pace-lit') || 1, 10) || 0;

/** The material's roughness. */
const rough = parseFloat(query.get('rough') || 0.7, 10) || 0;
/** The material's albedo. */
const albedo = parseFloat(query.get('albedo') || 0.9, 10) || 0;
/** The material's skin thickness. */
const skin = parseFloat(query.get('skin') || 1, 10) || 0;

/**
 * Variable-step (delta-time) if given `false`y/`NaN`; fixed-step (add-step)
 * if given another number; uses default fixed-step if not given.
 */
const timeQuery = query.get('timestep');

const timestepDef = 1e3/60;
/** Whether to use a fixed timestep or render variably as soon as possible. */
const timestep = parseFloat(timeQuery ?? timestepDef, 10) || null;

const guide = query.get('guide') !== 'false';

console.log(location.search+':\n', ...([...query.entries()].flat()), '\n',
  'merge:', merge, 'scale:', scale, 'steps:', steps, 'prefill:', prefill,
  'timestep:', timestep, 'depth:', fragDepth, 'form:', form, 'wide:', wide,
  'spin0:', spin0, 'spinPace:', spinPace, 'spoutPace:', spoutPace,
  'gapZ:', gapZ, 'shakeSource:', shakeSource, 'shakeSink:', shakeSink,
  'fizz:', fizz, 'hues:', hues, 'lit:', lit, 'paceLit:', paceLit,
  'rough:', rough, 'albedo:', albedo, 'skin:', skin);

// Set up the links.

function setupLink(a, to) {
  const { search, hash } = a;
  const has = (search.length > 1) && getQuery(search).entries();

  return a.href = '?'+
    setQuery((has && to)? [...has, ...to] : ((has)? [...has] : to))+hash;
}

setupLink(document.querySelector('#verlet'),
  [['steps', 2+bound], ['scale', 9]]);

setupLink(document.querySelector('#euler'), [['steps', 1+bound], ['scale', 9]]);
setupLink(document.querySelector('#trail'), [['steps', 9+bound], ['scale', 8]]);
setupLink(document.querySelector('#trace'), [['steps', 3e2], ['scale', 4]]);
setupLink(document.querySelector('#bubbles'));
setupLink(document.querySelector('#molecular'));
setupLink(document.querySelector('#millions'));

setupLink(document.querySelector('#form'),
  [['form', ((form)? ((form+1)%3 || null) : 1)]]);

setupLink(document.querySelector('#lit'),
  [['lit', ((lit === 'dark')? false : ((lit === 'false')? null : 'dark'))]]);

setupLink(document.querySelector('#spin'),
  [['spin-pace', ((spinPace)? 0 : null)]]);

setupLink(document.querySelector('#timestep'),
  [['timestep', ((timeQuery == null)? '' : null)]]);

setupLink(document.querySelector('#merge'),
  [['merge', ((merge)? false : null)]]);

setupLink(document.querySelector('#guide'),
  [['guide', ((guide)? false : null)]]);

// Toggle the guide according to query.
document.querySelector('#flip-guide').checked = guide;

/**
 * How state values map to any past state values they derive from.
 * Denoted as an array, nested 1-3 levels deep:
 * 1. In `values` order, indexes `values` to derive from, 1 step past.
 * 2. Indexes `values` to derive from, 1 step past.
 * 3. Shows how many steps past, then indexes `values` to derive from.
 */
const derives = [];

// Position value derives from:
derives[valuesIndex.position] = [
  // Position, 2 steps past.
  [wrap(1, stepsPast), valuesIndex.position],
  // Position, 1 step past.
  valuesIndex.position,
  // Motion, 1 step past.
  valuesIndex.motion,
  // Life, 1 step past.
  valuesIndex.life
];

// Motion value derives from:
derives[valuesIndex.motion] = [
  // Motion, 1 step past.
  valuesIndex.motion,
  // Life, 1 step past.
  valuesIndex.life,
  // Position, 1 step past.
  valuesIndex.position
];

// Life value derives from:
derives[valuesIndex.life] = [
  // Life, last step past.
  [wrap(-1, stepsPast), valuesIndex.life],
  // Life, 1 step past.
  valuesIndex.life
];

console.log(derives, '`derives`');

/**
 * Shake source or sink around while idling.
 *
 * @see [onSphere](./on-sphere.glsl)
 * @see [Spherical distribution](https://observablehq.com/@rreusser/equally-distributing-points-on-a-sphere)
 */
function shake(at, shaken, by, idle) {
  const l = (min(idle/5e3, 1)**5)*by;

  if(!l) { return at; }

  const a = random()*tau;
  const d = mix(-1, 1, random());
  const n = (1-(d*d))*l;
  const { 0: ax, 1: ay, 2: az, 3: aw, length: al } = at;

  setC2(shaken, ax+(cos(a)*n), ay+(sin(a)*n));
  (al > 2) && (shaken[2] = az+(d*l));
  (al > 3) && (shaken[3] = aw);
  shaken.length = al;

  return shaken;
}

/** Custom properties to be passed to shaders mixed in with `gl-gpgpu` ones. */
const props = {
  // Set up the timer.
  timer: timer({
    // Fixed-step (add-step), or real-time (variable delta-time).
    step: timestep || '-',
    now: ((timestep)? undefined : () => regl.now()*1e3),
    // Track past 2 time-differences for Verlet integration.
    dts: range(2, 0),
    // Amount of time without applicable user-interaction.
    idle: 0,
    // Speed up or slow down the passage of time.
    rate: 1,
    // Loop time over this period to avoid instability using unbounded `time`.
    loop: 1e6
  }),
  // A particle's lifetime range, and whether it's allowed to spawn.
  lifetime: [6e2, 6e3, +true],
  // Whether to use Verlet (midpoint) or Euler (forward) integration.
  useVerlet: +canVerlet,
  // A small number greater than 0; avoids speeds exploding.
  epsilon: 1e-5,
  // How faar a particle can move in any frame.
  moveCap: 7e-3,
  // Whether to primarily control the sink or source.
  flip: false,
  // The position around which particles spawn.
  source: {
    // The initial source, may be transformed into a new property `to`.
    at: [0, 0, gapZ],
    // If shaken around while idling, transform `to` or `at` into `shaken`.
    shake: shakeSource, shaken: []
  },
  // Sink position, and universal gravitational constant.
  sink: {
    // The initial sink, may be transformed into a new property `to`.
    at: [
      // Sink position.
      0, 0, 0,
      // Universal gravitational constant (scaled).
      6.674e-11*2e10
    ],
    // If shaken around while idling, transform `to` or `at` into `shaken`.
    shake: shakeSink, shaken: []
  },
  // Constant acceleration of gravity; and whether to use it or the `sink`.
  g: [
    // Constant acceleration of gravity.
    0, -9.80665, 0,
    // Whether to use it or the `sink`.
    +false
  ],
  // Speed scale. Exponent encoding `[b, p] => b*(10**p)` for numeric accuracy.
  pace: [1, -8],

  // One option in these arrays is used, by Euler/Verlet respectively.

  // The distance from the `source`, and speed, that particles spawn with.
  spout: [[0, 3e3*spoutPace], [0, 2e2*spoutPace]],
};

/** The main `gl-gpgpu` state. */
const state = gpgpu(regl, {
  // Logic given as state values, `gl-gpgpu` maps optimal inputs and outputs.
  maps: {
    // How many state values (channels) are tracked independently of others.
    values,
    // How state values map to any past state values they derive from.
    derives
  },
  // How many steps of state to track.
  steps,
  // How many states are bound to frame-buffer outputs at any step.
  bound,
  // How many entries to track, here encoded as the power-of-2 size per side
  // of the data texture: `(2**scale)**2`; can also be given in other ways.
  scale,
  // Whether to merge states into one texture; separate textures if not given.
  merge,
  // Data type according to platform capabilities.
  // @todo Seems to move differently with `'half float'` Verlet integration.
  type: ((extensionsFloat.every(regl.hasExtension))? 'float' : 'half float'),
  // Configure macro hooks, global or per-shader.
  macros: {
    // No macros needed for the `vert` shader; all other macros generated.
    macroVert: false
  },
  // A fragment shader to compute each state step, with `gl-gpgpu` macros.
  // Vertex shaders can also be given.
  frag: ((prefill)? '#define prefill\n\n' : '')+stepFrag,
  // Macros are prepended to `frag` shader per-pass, cached in `frags`.
  frags: [],
  // Custom properties to be passed to shaders mixed in with `gl-gpgpu` ones.
  props,
  // Custom uniforms in addition to those `gl-gpgpu` provides.
  uniforms: {
    dt: (_, { props: { timer: { dt, rate: r } } }) => dt*r,
    dt0: (_, { props: { timer: { dts, rate: r } } }) => dts[0]*r,
    dt1: (_, { props: { timer: { dts, rate: r } } }) => dts[1]*r,
    time: (_, { props: { timer: { time: t, rate: r } } }) => t*r,
    loop: (_, { props: { timer: { time: t, rate: r, loop: l } } }) =>
      abs((((t*r)+l)%(l*2))-l),

    // Shake the source around while idling.
    source: (_, { props: { source: { to, at, shaken, shake: by }, timer } }) =>
      shake(to ?? at, shaken, by, timer.idle),

    // Shake the sink around while idling.
    sink: (_, { props: { sink: { to, at, shaken, shake: by }, timer } }) =>
      shake(to ?? at, shaken, by, timer.idle),

    lifetime: regl.prop('props.lifetime'),
    useVerlet: regl.prop('props.useVerlet'),
    epsilon: regl.prop('props.epsilon'),
    moveCap: regl.prop('props.moveCap'),
    g: regl.prop('props.g'),
    pace: regl.prop('props.pace'),

    // One option in these arrays is used, by Euler/Verlet respectively.
    spout: (_, { props: { spout: ss, useVerlet: u } }) => ss[+u],
  }
});

console.log(self.state = state);

console.group('How `values` are `packed` to fit texture channels efficiently');
console.log(state.maps.values, '`values` (referred to by index)');
console.log(state.maps.packed, '`packed` (indexes `values`)');
console.log(...state.maps.textures, '`textures` (indexes `values`)');
console.log(state.maps.valueToTexture, '`valueToTexture` (indexes `textures`)');
console.groupEnd();

function stepTime(state) {
  const { dts } = state;

  dts[0] = dts[1];
  state.idle += (dts[1] = timer(state).dt);

  return state;
}

// Set up rendering.

/**
 * Draw all states with none bound as outputs.
 * @todo Errors without `merge`; why, if the framebuffer isn't bound?
 */
const drawBound = +(!merge);

const drawSteps = steps-drawBound;
const useLines = merge && (drawSteps > 1);

console.log('drawSteps', drawSteps, 'useLines', useLines);

/**
 * Vertex counts by form; how many steps a form covers, for all entries;
 * respectively for: none, points, lines.
 * Note `state.size.entries` equals the value returned by `countDrawIndexes`.
 */
const drawCounts = map((_, f) => indexForms(drawSteps, f, state.size.entries),
  range(2+useLines), 0);

/** Use `min` for contain, `max` for cover. */
const viewScale = min;

/**
 * @see [glsl-aspect](https://github.com/keeffEoghan/glsl-aspect/blob/master/index.glsl)
 * @see [glsl-aspect/contain](https://github.com/keeffEoghan/glsl-aspect/blob/master/contain.glsl)
 */
const aspect = (size, ar) => invert2(ar, divN2(ar, size, viewScale(...size)));

/** Reuse the `gpgpu` state, mix in drawing-specific state. */
const drawState = {
  ...state,
  // Omit some properties unused in drawing for some clarity.
  count: undefined, vert: undefined, frag: undefined, attributes: undefined,
  // Override other properties for drawing.
  bound: drawBound,
  // Drawing, not data - so no `output` macros. Also, don't need `frag` macros.
  macros: { output: 0, frag: 0 },
  drawProps: {
    // Transformation matrices.
    model: {
      matrix: identity44([]), inverse: identity44([]),
      // Continuous rotation.
      rotation: identity44([]),
      axis: [0, 1, 0],
      angle: (timestep || timestepDef)*spinPace*tau,
      angle0: spin0*tau
    },
    view: {
      matrix: identity44([]), inverse: identity44([]),
      // Look from the `eye` at the `target` while oriented `up`.
      eye: [0, 0, 0.5], target: [0, 0, 0], up: [0, 1, 0],
      // Ray origin and direction for casting.
      ray: [[], []]
    },
    projection: { matrix: identity44([]), inverse: identity44([]) },
    // Cached combined transformations.
    transform: {
      modelView: { matrix: identity44([]), inverse: identity44([]) },
      // viewProjection: { matrix: identity44([]), inverse: identity44([]) },
      modelViewProjection: { matrix: identity44([]), inverse: identity44([]) }
    },
    // View dimensions.
    size: [1, 1],
    // View aspect ratio scale, per x- and y-axes.
    aspect: [1, 1],
    light: {
      ambient: range(3, ((lit === 'dark')? 0.1 : ((lit === 'false')? 1 : 0.3))),
      // Point-lights: position (`at` transforms `to`); color, attenuate factor.
      points: ((lit && (lit.search(/^(dark|false)$/g) === 0))? null : [
        // A white spherical-light with radius `0.3` - see https://imdoingitwrong.wordpress.com/2011/01/31/light-attenuation/
        { at: [0, 1, 0], color: [20, 20, 20], factor: [1, 2/0.3, 0.3**-2] },
        // A cyan-ish point-light, higher linear attenuation.
        {
          at: [cos(0), -1, sin(0)],
          color: [1, 9, 9], factor: [1, 9, 3]
        },
        // A magenta-ish point-light, higher quadratic attenuation.
        {
          at: [cos(tau*0.33), -1, sin(tau*0.33)],
          color: [9, 1, 9], factor: [1, 3, 9]
        },
        // A yellow-ish point-light, even attenuation.
        {
          at: [cos(tau*0.66), -1, sin(tau*0.66)],
          color: [9, 9, 1], factor: [1, 5, 5]
        }
      ])
    },
    // Material roughness, albedo, and skin thickness.
    material: [rough, albedo, skin],
    // Scale depths over near and far range, and precision (arbitrarily).
    depths: [1e-2, 1, 5e-2/depthBits],
    // Fog start offset, scale, exponent, maximum effect.
    fog: [-1, 0.4, 1, 0.9],
    // The clear and fog color.
    clear: [0, 0, 0, 0],
    // How many vertexes per form.
    form: clamp(form || 2, 1, 1+useLines),
    // Vertex counts, by form; how many steps a form covers, for all entries.
    counts: drawCounts,
    // Which primitives can be drawn, by form.
    primitives: [, 'points', 'lines'],
    // Which primitive dimensions can be drawn, by form.
    widths: [, pointSizeDims, lineWidthDims],
    // How wide the form is; to be scaled by `viewScale`.
    wide,
    // How many older state positions to fizz around, and other inputs.
    fizz,
    // Hue range to colour particles.
    hues,

    // One option in these arrays is used, by Euler/Verlet respectively.

    // Speed-to-colour scaling, as `[multiply, power]`.
    paceColor: [[paceLit*2e-9, 2], [paceLit*2e7, 2]]
  },
  // Map everything similarly to the `gpgpu` step, `mapStep` can be reused to
  // create new mappings with some additions for drawing.
  maps: mapStep({
    ...state.maps,
    // This one pass can bind textures for input; not output across passes.
    texturesMax: maxTextureUnits,

    /**
     * One set of lookups/reads of all values in one pass.
     * Passing `true` adds all values at that level of nesting:
     * `pass|[values|[value|[step, value]]]`
     * Thus, this example means that the _first_ value derives from:
     * - All values 1 step past (`true`).
     * - The position value 2 steps past.
     * Makes `reads_0_i` macros for each `i => [step, value]` of
     * `[[0, 0], [0, 1], [0, 2], [1, 0]]`
     */
    derives: [[true, [wrap(1, drawSteps), valuesIndex.position]]]
  })
};

/** Hook up `gpgpu` uniforms by extending them. */
const drawUniforms = toUniforms(drawState, {
  ...drawState.uniforms,

  modelView: regl.prop('drawProps.transform.modelView.matrix'),
  projection: regl.prop('drawProps.projection.matrix'),
  eye: regl.prop('drawProps.view.eye'),
  aspect: regl.prop('drawProps.aspect'),
  material: regl.prop('drawProps.material'),
  depths: regl.prop('drawProps.depths'),
  fog: regl.prop('drawProps.fog'),
  clear: regl.prop('drawProps.clear'),
  // How many vertexes per form.
  form: regl.prop('drawProps.form'),
  fizz: regl.prop('drawProps.fizz.at'),
  fizzMax: regl.prop('drawProps.fizz.max'),
  fizzRate: regl.prop('drawProps.fizz.rate'),
  fizzCurve: regl.prop('drawProps.fizz.curve'),
  hues: regl.prop('drawProps.hues'),
  lightAmbient: regl.prop('drawProps.light.ambient'),

  paceColor: (_, { drawProps: dp, props: p }) => dp.paceColor[+p.useVerlet],

  wide: (_, { drawProps: { wide: w, widths: ws, form: f, size: s } }) =>
    clamp(w*viewScale(...s), ...ws[f])
});

/** Convert point-lights from object-oriented to flat data-oriented. */
const lightPoints = drawState.drawProps.light.points;

lightPoints && reduce((o, _, l) => {
    const n = 'lightPoint';
    const i = `[${l}]`;

    o[n+'Positions'+i] = (_, p) => {
      const { light, transform } = p.drawProps;
      const lp = light.points[l];
      const { at, to = lp.to = [] } = lp;

      return mulV344(to, transform.modelView.matrix, at);
    };

    o[n+'Colors'+i] = regl.prop(`drawProps.light.points${i}.color`);
    o[n+'Factors'+i] = regl.prop(`drawProps.light.points${i}.factor`);

    return o;
  },
  lightPoints, drawUniforms);

/** The `GL` render command pipeline state. */
const drawPipeline = {
  // Use `gpgpu` `macro` mappings by prepending `macro`s from a single pass.
  vert: (_, p) => macroPass(p)+
    `#define lightPointsL ${p.drawProps.light.points?.length ?? 0}\n`+drawVert,

  frag: (_, p) =>
    `#define lightPointsL ${p.drawProps.light.points?.length ?? 0}\n`+drawFrag,

  // Maximum count here to set up buffers, can be partly used later.
  attributes: { index: getDrawIndexes(max(...drawCounts)) },
  uniforms: drawUniforms,
  lineWidth: (_, { drawProps: { wide: w, size: s } }) =>
    clamp(w*viewScale(...s), ...lineWidthDims),
  // Vertex counts by form; how many steps a form covers, for all entries.
  count: (_, { count: c, drawProps: { counts: cs, form: f } }) => c ?? cs[f],
  blend: { enable: true, func: { src: 'one', dst: 'one minus src alpha' } },

  primitive: (_, { drawProps: { primitive: p, primitives: ps, form: f } }) =>
    p ?? ps[f]
};

console.log((self.drawState = drawState), (self.drawPipeline = drawPipeline));

/** Function to execute the render command pipeline state every frame. */
const draw = regl(drawPipeline);
const clearView = { color: drawState.drawProps.clear, depth: 1 };

/** Rotate the model by an angle; update the matrix and inverse. */
function rotateModel(by = 0) {
  const { model } = drawState.drawProps;
  const { rotation: r, axis, angle, matrix: mm, inverse: mi } = model;

  return invert44(mi, mulM44(mm, rotationAroundAxis44(r, axis, angle+by), mm));
}

/** Update the view matrix and inverse. */
function updateView() {
  const { eye, target, up, matrix: vm, inverse: vi } = drawState.drawProps.view;

  return invert44(vi, lookAt(vm, eye, target, up));
}

/** Update the projection matrix and inverse. */
function updateProjection() {
  const { depths: [d0, d1], projection: p } = drawState.drawProps;
  const { matrix: pm, inverse: pi } = p;

  /** Aspect ratio is handled separately, so set to 1 in the projection. */
  invert44(pi, perspective(pm, 40, 1, d0, d1));
}

/** Update each needed cached combined transformation matrix and inverse. */
function updateTransform() {
  const { transform: t, model, view, projection } = drawState.drawProps;
  const { modelView: tmv, viewProjection: tvp, modelViewProjection: tmvp } = t;
  const mm = model.matrix;
  const vm = view.matrix;
  const pm = projection.matrix;

  tmv && invert44(tmv.inverse, concat(tmv.matrix, vm, mm));
  tvp && invert44(tvp.inverse, concat(tvp.matrix, pm, vm));
  tmvp && invert44(tmvp.inverse, concat(tmvp.matrix, pm, vm, mm));
}

/** Rotate the model to its starting angle. */
rotateModel(drawState.drawProps.model.angle0);
/** Initialise the view matrix. */
updateView();
/** Initialise the projection matrix. */
updateProjection();

function stopEvent(e) {
  e.stopPropagation();
  e.preventDefault();
}

/** Pause the spawning while pointer is held down. */
let hold;

/** Pause particles spawning. */
canvas.addEventListener('contextmenu', (e) => {
  // Whether a particle's allowed to spawn.
  state.props.lifetime[2] = +false;
  hold = false;
  stopEvent(e);
});

/** Toggle physics and graphics modes. */
canvas.addEventListener((('onpointerup' in self)? 'pointerup'
    : (('ontouchend' in self)? 'touchend' : 'mouseup')),
  (e) => {
    /** Unpause the spawning when pointer is released. */
    const spawned = state.props.lifetime[2];
    const held = hold;

    // Whether a particle's allowed to spawn.
    state.props.lifetime[2] = +true;
    hold = false;

    // Don't switch modes if pointer was being held down, particles weren't
    // allowed to spawn, or any non-primary button was released.
    if(held || !spawned || (e.button !== 0)) { return; }

    // Switch between physics/drawing modes if this wasn't press-held.

    const { props: p, drawProps: d } = drawState;
    const v = canVerlet && (p.useVerlet = 1-p.useVerlet);
    const f = form || (d.form = 1+(useLines && ((canVerlet)? v : d.form%2)));

    console.log('useVerlet', v, 'form', f,
      // See how this derives other properties.
      'count', drawPipeline.count(0, drawState),
      'primitive', drawPipeline.primitive(0, drawState));
  });

/** Move either the source or the sink, according to primary pointer. */
canvas.addEventListener((('onpointermove' in self)? 'pointermove'
    : (('ontouchmove' in self)? 'touchmove' : 'mousemove')),
  (e) => {
    const { clientX: x, clientY: y, type, pointerType, isPrimary = true } = e;
    const { top, right, bottom, left } = canvas.getBoundingClientRect();
    const { source: i, sink: o, flip, timer: t } = state.props;
    const touch = ((type === 'touchmove') || (pointerType === 'touch'));
    /** Move source or sink, switch by primary/other pointer/s `xor` flip. */
    const pick = ((isPrimary !== flip)? i : o);
    /** Transform from screen-space to world-space. */
    const { at, to = pick.to = [] } = pick;
    const { aspect: ar, transform, model, view } = drawState.drawProps;
    const { eye, ray: [ro, rv] } = view;

    /** Include any additional data. */
    map((v) => v, at, to);
    /** Screen-space pointer as a `ray` target. */
    setC3(rv, fit(x, left, right, -1, 1), fit(y, top, bottom, 1, -1), 1);
    /** Aspect ratio scale and un-project the `ray` target. */
    mulV344(rv, transform.modelViewProjection.inverse, div2(rv, rv, ar));
    /** Un-transform `eye` as `ray` origin, subtract `ray` target as vector. */
    sub3(rv, rv, mulV344(ro, model.inverse, eye));
    /** Cast along `ray` by the initial `eye` to `at` distance, as `to`. */
    add3(to, ro, normalize3(rv, rv, dist3(eye, at)));

    // For touch devices, don't pause spawn if touch moves while held down.
    touch && (hold = true);
    // Reset the idle time for any movement.
    t.idle = 0;
  });

/** Switch primary pointer control between source and sink. */
canvas.addEventListener('dblclick', (e) => {
  state.props.flip = !state.props.flip;
  stopEvent(e);
});

/** Toggle fullscreen. */
document.querySelector('#fullscreen').addEventListener('click',
  () => canvas.requestFullscreen());

/** Resize the canvas and any dependent properties. */
function resize() {
  const { drawProps } = drawState;
  const { size, aspect: ar } = drawProps;
  const [w, h] = mulN2(size, setC2(size, innerWidth, innerHeight), pixelRatio);

  canvas.width = w;
  canvas.height = h;
  aspect(size, ar);
}

addEventListener('resize', resize);
resize();

/** Compute the next step of state for a frame. */
function frameStep() {
  try {
    stepTime(state.props.timer);
    state.step();
  }
  catch(e) { toggleError(e); }
}

// Whether to prefill initial states before spawning, or start with all `0`.
for(let p = prefill && stepsPast; p; --p) { frameStep(); }

regl.frame(() => {
  try {
    frameStep();
    // Update the draw state.
    drawState.stepNow = (state.stepNow+1)-drawBound;
    // Rotate the scene each frame.
    rotateModel();
    // Update the transformation matrices.
    updateTransform();
    // Clear and draw.
    regl.clear(clearView);
    draw(drawState);
  }
  catch(e) { toggleError(e); }
});
