/** Demo implementation of 3D particle Verlet/Euler integration simulation. */

import getRegl from 'regl';
import clamp from 'clamp';
import timer from '@epok.tech/fn-time';
import reduce from '@epok.tech/fn-lists/reduce';
import map from '@epok.tech/fn-lists/map';
import each from '@epok.tech/fn-lists/each';
import range from '@epok.tech/fn-lists/range';
import wrap from '@epok.tech/fn-lists/wrap';

import { gpgpu, extensionsFloat, extensionsHalfFloat, optionalExtensions }
    from '../../index';

import { macroPass } from '../../macros';
import { getMaps } from '../../maps';
import { getUniforms } from '../../inputs';
import { getDrawIndexes } from '../../size';
import indexForms from '../../index-forms';

import stepFrag from './step.frag.glsl';
import drawVert from './draw.vert.glsl';
import drawFrag from './draw.frag.glsl';

self.gpgpu = gpgpu;
self.macroPass = macroPass;
self.getMaps = getMaps;
self.getUniforms = getUniforms;
self.getDrawIndexes = getDrawIndexes;
self.indexForms = indexForms;

const extend = {
    halfFloat: extensionsHalfFloat?.(),
    float: extensionsFloat?.(),
    other: optionalExtensions?.()
};

const regl = self.regl = getRegl({
    pixelRatio: Math.max(Math.floor(devicePixelRatio), 1.5),
    extensions: extend.required = extend.halfFloat,
    optionalExtensions: extend.optional = [...extend.float, ...extend.other]
});

console.group('Extensions');

console.log('required', (extend.required &&
    reduce((o, e) => o+(o && '; ')+e+': '+regl.hasExtension(e),
        extend.required, '')));

console.log('optional', (extend.optional &&
    reduce((o, e) => o+(o && '; ')+e+': '+regl.hasExtension(e),
        extend.optional, '')));

console.groupEnd();

const canvas = document.querySelector('canvas');

canvas.classList.add('view');

// How many frame-buffers are bound at a given time.
const bound = 1;

// How many values/channels each property independently tracks.
// The order here corresponds to the order in the shaders and generated macros,
// though these may be `packed` across channels/textures/passes differently.

const valuesMap = (new Map())
    .set('position', 3).set('motion', 3).set('life', 1);

const values = [];
const valuesIndex = {};

valuesMap.forEach((v, k) => valuesIndex[k] = values.push(v)-1);

// Limits of this device and these `values`.
const { maxTextureUnits, maxTextureSize, lineWidthDims, pointSizeDims } =
    regl.limits;

const limits = {
    steps: [
        1+bound,
        Math.floor((maxTextureUnits-bound)/(reduce((s, v) => s+v, values, 0)/4))
    ],
    // Better stay farther under maximum texture size, or errors/crashes.
    scale: [0, Math.log2(maxTextureSize)]
};

const niceScale = clamp(8, ...limits.scale);

console.log('limits', limits, regl.limits);

// Handle query parameters.

const getQuery = (search = location.search) => new URLSearchParams(search);

function setQuery(entries, query = getQuery()) {
    each(([k, v = null]) => ((v === null)? query.delete(k) : query.set(k, v)),
        entries);

    return query;
}

let query = getQuery();

// 2 active states, as many others as can be bound; at least 2 past states
// needed for Verlet integration, 1 for Euler integration.
const steps = clamp((parseInt(query.get('steps'), 10) || 2+bound),
    ...limits.steps);

// How many past steps (not bound to outputs) are in the GPGPU state.
const stepsPast = steps-bound;
// Whether to allow Verlet integration; according to available resource limits.
const canVerlet = (stepsPast > 1);

const scale = clamp((parseInt(query.get('scale'), 10) || niceScale),
    ...limits.scale);

// Form vertexes to draw; if not given, uses trails of 'lines' if there are
// enough steps, or 'points' if not.
const form = (parseInt(query.get('form'), 10) || 0);

// Constant-step (add time-step), if given; if not given, uses real-time
// (variable delta-time).
const hasTimestep = query.has('timestep');
const timestepDef = 1e3/60;

const timestep = (hasTimestep &&
    (parseFloat(query.get('timestep'), 10) || timestepDef));

// Whether to merge states into a texture.
let merge = query.get('merge');

merge = ((merge)? (merge !== 'false') : (form !== 1));

console.log(location.search+':\n', ...([...query.entries()].flat()), '\n',
    'steps:', steps, 'scale:', scale, 'form:', form,
    'timestep:', timestep, 'merge:', merge);

// Set up the links.

document.querySelector('#verlet').href =
    `?${setQuery([['steps'], ['scale']])}#verlet`;

document.querySelector('#euler').href = `?${setQuery([
        ['steps', 1+bound], ['scale', Math.min(niceScale+1, limits.scale[1])]
    ])}#euler`;

document.querySelector('#long').href = `?${setQuery([
        ['steps', limits.steps[1]],
        ['scale', Math.max(niceScale-1, limits.scale[0])]
    ])}#long`;

document.querySelector('#high').href = `?${setQuery([
        ['steps', Math.max(limits.steps[0], limits.steps[1]-3)],
        ['scale', Math.max(niceScale, limits.scale[1]-5)]
    ])}#high`;

document.querySelector('#trails').href =
    `?${setQuery([['form', ((form)? 0 : 1)]])}#trails`;

document.querySelector('#timestep').href =
    `?${setQuery([['timestep', ((timestep)? null : timestepDef)]])}#timestep`;

document.querySelector('#merge').href =
    `?${setQuery([['merge', ((merge)? false : null)]])}#merge`;

// How values/channels map to their derivations.

const derives = [];

derives[valuesIndex.position] = [
    // Position, 2 steps past.
    [wrap(1, stepsPast), valuesIndex.position],
    // Position, 1 step past.
    valuesIndex.position,
    valuesIndex.motion,
    valuesIndex.life
];

derives[valuesIndex.motion] = [
    valuesIndex.motion,
    valuesIndex.life,
    valuesIndex.position
];

derives[valuesIndex.life] = [
    // Life, last step past.
    [wrap(-1, stepsPast), valuesIndex.life],
    // Life, 1 step past.
    valuesIndex.life
];

// The main GPGPU state.
const state = gpgpu(regl, {
    // Prefix usually recommended; none here to check for naming clashes.
    pre: '',
    bound, steps, scale, merge, maps: { values, derives },
    // Data type according to support.
    type: ((extend.float.every(regl.hasExtension))? 'float' : 'half float'),
    // Per-shader macro hooks, no macros needed for the `vert` shader.
    macros: { vert: false },
    props: {
        // Set up the timer.
        timer: timer((timestep)?
                // Constant-step (add time-step).
                { step: timestep, dts: range(2, 0) }
                // Real-time (variable delta-time).
            :   { step: '-', now: () => regl.now()*1e3, dts: range(2, 0) }),
        // Speed up or slow down the passage of time.
        rate: 1,
        // Loop time over this period to avoid instability of parts of the demo.
        loop: 3e3,
        // Range of how long a particle lives, and whether it can respawn.
        lifetime: [3e2, 4e3, +true],
        // Whether to use Verlet (midpoint) or Euler (forward) integration.
        useVerlet: +canVerlet,
        // A small number greater than 0; avoids speeds exploding.
        epsilon: 1e-5,
        // The position particles respawn from.
        source: [0, 0, 0.4],
        // Gravitation position, and universal constant.
        gravitation: [
            // Gravitation position.
            0, 0, 0.6,
            // Universal gravitational constant (scaled).
            6.674e-11*5e10
        ],
        // Constant acceleration due to gravity; and whether to use it, uses
        // gravitation if not.
        g: [
            // Constant acceleration due to gravity.
            0, -9.80665, 0,
            // Whether to use it, uses gravitation if not.
            +false
        ],
        // For numeric accuracy, encoded as exponent `[b, p] => b*(10**p)`.
        scale: [1, -7],

        // One option in these arrays is used, by Euler/Verlet respectively.

        // The motion particles respawn with.
        spout: [3e3, 2e2],
        // Drag coefficient.
        // drag: [range(3, 1e-3), range(3, 1e-1)]
    },
    step: {
        // Per-pass macros will prepend to `frag` shader and cache in `frags`.
        frag: stepFrag, frags: [],
        uniforms: {
            dt: (_, { props: { timer: { dt }, rate: r } }) => dt*r,
            dt0: (_, { props: { timer: { dts: { 0: dt } }, rate: r } }) => dt*r,
            dt1: (_, { props: { timer: { dts: { 1: dt } }, rate: r } }) => dt*r,
            time: (_, { props: { timer: { time: t }, rate: r } }) => t*r,

            loop: (_, { props: { timer: { time: t }, loop: l } }) =>
                Math.sin(t/l*Math.PI)*l,

            lifetime: regl.prop('props.lifetime'),
            useVerlet: regl.prop('props.useVerlet'),
            epsilon: regl.prop('props.epsilon'),
            source: regl.prop('props.source'),
            gravitation: regl.prop('props.gravitation'),
            g: regl.prop('props.g'),
            scale: regl.prop('props.scale'),

            // One option in these arrays is used, by Euler/Verlet respectively.
            spout: (_, { props: { spout: ss, useVerlet: u } }) => ss[+u],
            // drag: (_, { props: { drag: ds, useVerlet: u } }) => ds[+u]
        }
    }
});

console.log(self.state = state);

console.group('How `values` are `packed` to fit texture channels efficiently');
console.log(state.maps.values, '`values` (referred to by index)');
console.log(state.maps.packed, '`packed` (indexes `values`)');
console.log(...state.maps.textures, '`textures` (indexes `values`)');
console.log(state.maps.valueToTexture, '`valueToTexture` (indexes `textures`)');
console.groupEnd();

// Set up rendering.

// Draw all states with none bound as outputs.
// @todo Errors without `merge`; why, if the framebuffer isn't bound?
const drawBound = +(!merge);
const drawSteps = steps-drawBound;
const useLines = (merge && (drawSteps > 1));

console.log('drawSteps', drawSteps, 'useLines', useLines);

// Vertex counts by form; how many steps a form covers, for all entries;
// respectively for: none, points, lines.
// Note `state.size.count` will equal the value returned by `countDrawIndexes`.
const drawCounts = map((_, f) => indexForms(drawSteps, f, state.size.count),
    range(2+useLines), 0);

const drawState = {
    ...state,
    bound: drawBound,
    // Drawing, don't need to output any data; also don't need `frag` macros.
    macros: { 'output': 0, 'frag': 0 },
    drawProps: {
        // How many vertexes per form.
        form: (form || 1+useLines),
        // Vertex counts by form; how many steps a form covers, for all entries.
        count: null,
        counts: drawCounts,
        // Which primitives can be drawn.
        primitive: null,
        primitives: [, 'points', 'lines'],
        // How wide the form is.
        wide: 2**3,
        // Speed-to-colour scaling, as `[multiply, power]`.
        // One option in these arrays is used, by Euler/Verlet respectively.
        pace: [[1e-3, 0.6], [3e2, 0.6]]
    },
    // Everything mapped the same way.
    maps: getMaps({
        ...state.maps,
        // This one pass can bind textures for input; not output across passes.
        texturesMax: maxTextureUnits,
        /**
         * One set of reads of all values in one pass.
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

const drawCommand = {
    // Use GPGPU macro mappings by prepending macros from a single pass.
    vert: macroPass(drawState)+drawVert, frag: drawFrag,
    // Maximum count here to set up buffers, can be partly used later.
    attributes: { index: getDrawIndexes(Math.max(...drawCounts)) },
    // Hook up GPGPU uniforms by adding them here.
    uniforms: getUniforms(drawState, {
        ...drawState.step.uniforms,
        scale: regl.prop('props.scale'),
        // How many vertexes per form.
        form: regl.prop('drawProps.form'),
        pace: (_, { drawProps: { pace }, props: { useVerlet: u } }) => pace[+u],
        pointSize: (_, { drawProps: { wide: w } }) => clamp(w, ...pointSizeDims)
    }),
    lineWidth: (_, { drawProps: { wide: w } }) => clamp(w, ...lineWidthDims),
    // Vertex counts by form; how many steps a form covers, for all entries.
    count: (_, { drawProps: { count: c, counts: cs, form: f } }) => c ?? cs[f],
    depth: { enable: true },
    blend: { enable: true, func: { src: 'one', dst: 'one minus src alpha' } },

    primitive: (_, { drawProps: { primitive: p, primitives: ps, form: f } }) =>
        p ?? ps[f]
};

// @todo Why doesn't specifying point `form` seem to work on Android mobile?
// alert('form! '+drawState.drawProps.form+'; count! '+drawCommand.count(0, drawState)+'; useLines: '+useLines);
console.log((self.drawState = drawState), (self.drawCommand = drawCommand));

const draw = regl(drawCommand);

function stepTime(state) {
    const { dts } = state;

    dts[0] = dts[1];
    dts[1] = timer(state).dt;

    return state;
}

const clearView = { color: [0, 0, 0, 0], depth: 1 };

regl.frame(() => {
    stepTime(state.props.timer);
    state.step.run();
    drawState.stepNow = state.stepNow+1-drawBound;
    regl.clear(clearView);
    draw(drawState);
});

function stopEvent(e) {
    e.stopPropagation();
    e.preventDefault();
}

// Pause the spawning while pointer is held down.
let held;

function pauseSpawn() {
    clearTimeout(held);

    return (held = setTimeout(() => {
            state.props.lifetime[2] = +false;
            held = false;
        }, 5e2));
}

function startSpawn(hold) {
    clearTimeout(held);
    state.props.lifetime[2] = +true;

    return (held = hold);
}

canvas.addEventListener((('onpointerdown' in self)? 'pointerdown'
        : (('ontouchstart' in self)? 'touchstart' : 'mousedown')), (e) => {
    pauseSpawn();
    stopEvent(e);
});

// Toggle Verlet integration, if there are enough past steps.
canvas.addEventListener((('onpointerup' in self)? 'pointerup'
        : (('ontouchend' in self)? 'touchend' : 'mouseup')), (e) => {
    // Unpause the spawning when pointer is released.
    const h = held;
    const spawn = state.props.lifetime[2];

    startSpawn();
    stopEvent(e);

    if((h === true) || !spawn) { return; }

    // Switch between physics/drawing modes if this wasn't press-held.

    const { props: p, drawProps: d } = drawState;
    const v = (canVerlet && (p.useVerlet = 1-p.useVerlet));
    const f = (form || (d.form = 1+(useLines && ((canVerlet)? v : d.form%2))));

    console.log('useVerlet', v, 'form', f,
        // See how this derives other properties.
        'count', drawCommand.count(0, drawState),
        'primitive', drawCommand.primitive(0, drawState));
});

canvas.addEventListener((('onpointermove' in self)? 'pointermove'
        : (('ontouchmove' in self)? 'touchmove' : 'mousemove')), (e) => {
    const { clientX: x, clientY: y } = e;
    const { source } = state.props;
    const size = Math.min(innerWidth, innerHeight);

    source[0] = ((((x-((innerWidth-size)*0.5))/size)*2)-1);
    source[1] = -((((y-((innerHeight-size)*0.5))/size)*2)-1);

    // For touch devices, don't pause spawn if touch moves.
    (((e.type === 'touchmove') || (e.pointerType === 'touch')) &&
        startSpawn(true));

    stopEvent(e);
});

canvas.addEventListener('touchmove', stopEvent);
canvas.addEventListener('contextmenu', stopEvent);

module?.hot?.accept?.(location.reload);
