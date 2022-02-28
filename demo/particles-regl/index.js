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
import { mapFlow } from '../../maps';
import { getUniforms } from '../../inputs';
import { getDrawIndexes } from '../../size';
import indexForms from '../../index-forms';

import stepFrag from './step.frag.glsl';
import drawVert from './draw.vert.glsl';
import drawFrag from './draw.frag.glsl';

self.gpgpu = gpgpu;
self.macroPass = macroPass;
self.mapFlow = mapFlow;
self.getUniforms = getUniforms;
self.getDrawIndexes = getDrawIndexes;
self.indexForms = indexForms;

const canvas = document.querySelector('canvas');

// Scroll to the top.
const scroll = () => setTimeout(() => canvas.scrollIntoView(true), 0);

scroll();

function toggleError(e) {
    document.querySelector('.error').classList[(e)? 'remove' : 'add']('hide');
    canvas.classList[(e)? 'add' : 'remove']('hide');
    scroll();
}

// Handle query parameters.

const getQuery = (search = location.search) => new URLSearchParams(search);

function setQuery(entries, query = getQuery()) {
    each(([k, v = null]) => ((v === null)? query.delete(k) : query.set(k, v)),
        entries);

    return query;
}

let query = getQuery();
const fragDepth = (query.get('depth') === 'frag');

// Set up GL.

const extend = {
    halfFloat: extensionsHalfFloat?.(),
    float: extensionsFloat?.(),
    other: optionalExtensions?.(),
    depth: (fragDepth && 'EXT_frag_depth')
};

const pixelRatio = (Math.max(devicePixelRatio, 1.5) || 1.5);

const regl = self.regl = getRegl({
    canvas, pixelRatio,
    extensions: extend.required = extend.halfFloat,

    optionalExtensions: extend.optional = ((fragDepth)?
            [...extend.float, ...extend.other, extend.depth]
        :   [...extend.float, ...extend.other]),

    onDone: (e) => toggleError(e)
});

console.group('Extensions');

console.log('required', (extend.required &&
    reduce((o, e) => o+(o && '; ')+e+': '+regl.hasExtension(e),
        extend.required, '')));

console.log('optional', (extend.optional &&
    reduce((o, e) => o+(o && '; ')+e+': '+regl.hasExtension(e),
        extend.optional, '')));

console.groupEnd();

// How many state values (channels) are tracked independently of others.
// The order here is the order used in the shaders and generated macros, but for
// optimal lookups may be `packed` into channels/textures/passes differently.

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

// Limits of this device and these `values`.
const { maxTextureUnits, maxTextureSize, lineWidthDims, pointSizeDims } =
    regl.limits;

// Whether to merge states into one texture; separate textures if not given.
const useMerge = query.get('merge');
// Merge by default for maximum platform compatibility.
const merge = (!useMerge || (useMerge !== 'false'));
// @todo Should work in one of these cases:
// const merge = ((useMerge)? (useMerge !== 'false') : (stepsPast > 1));
// const merge = ((useMerge)? (useMerge !== 'false') : (form !== 1));

// How many steps are used for output at a given time.
const bound = 1;

// Better stay farther under maximum texture size, or errors/crashes.
// @todo Drawing issues with `scale` and `steps` both over 10.
const limits = { scale: [0, Math.log2(maxTextureSize)] };

const niceScale = clamp(8, ...limits.scale);

const scale = clamp((parseFloat(query.get('scale'), 10) || niceScale),
    ...limits.scale);

limits.steps = [
    1+bound,
    ((merge)?
        // Maximum steps must fit the maximum total texture size if merging.
        Math.floor(maxTextureSize/(2**scale))
        // Maximum steps must fit the maximum total texture units if separate.
    :   Math.floor((maxTextureUnits-bound)/reduce((s, v) => s+v, values)*4))
];

console.log('limits', limits, regl.limits);

// 2 active states, as many others as can be bound; at least 2 past states
// needed for Verlet integration, 1 for Euler integration.
const steps = Math.floor(clamp((parseFloat(query.get('steps'), 10) || 2+bound),
    ...limits.steps));

// How many past steps (not bound to outputs) are in the GPGPU state.
const stepsPast = steps-bound;
// Whether to allow Verlet integration; according to available resource limits.
const canVerlet = (stepsPast > 1);

// Form vertexes to draw; if not given, uses trails of 'lines' if there are
// enough steps, or 'points' if not.
const form = Math.floor(parseFloat(query.get('form'), 10) || 0);
// How wide the form is; to be scaled by `viewScale`.
const wide = (parseFloat(query.get('wide'), 10) || 4e-3*pixelRatio);

// Variable-step (delta-time) if given falsey/`NaN`; fixed-step (add-step)
// if given another number; uses default fixed-step if not given.
const hasTimestep = query.has('timestep');

const timestep = ((hasTimestep)? (parseFloat(query.get('timestep'), 10) || null)
    :   1e3/60);

console.log(location.search+':\n', ...([...query.entries()].flat()), '\n',
    'steps:', steps, 'scale:', scale, 'form:', form, 'wide:', wide,
    'depth:', fragDepth, 'timestep:', timestep, 'merge:', merge);

// Set up the links.

document.querySelector('#verlet').href = `?${
    setQuery([['steps', 2+bound], ['scale', 9], ['wide'], ['depth']])}#verlet`;

document.querySelector('#euler').href = `?${
    setQuery([['steps', 1+bound], ['scale', 9], ['wide'], ['depth']])}#euler`;

document.querySelector('#long').href = `?${
    setQuery([['steps', 9+bound], ['scale', 8], ['wide'], ['depth']])}#long`;

document.querySelector('#trace').href = `?${
    setQuery([['steps', 3e2], ['scale', 2], ['wide'], ['depth']])}#trace`;

document.querySelector('#trails').href =
    `?${setQuery([['form', ((form)? ((form+1)%3 || null) : 1)]])}#trails`;

document.querySelector('#timestep').href =
    `?${setQuery([['timestep', ((hasTimestep)? null : 0)]])}#timestep`;

document.querySelector('#merge').href =
    `?${setQuery([['merge',
        ((!useMerge)? true : ((useMerge !== 'false')? false : null))]])}#merge`;

// How state values map to any past state values they derive from.
// Denoted as an array, nested 1-3 levels deep:
// 1. In `values` order, indexes `values` to derive from, 1 step past.
// 2. Indexes `values` to derive from, 1 step past.
// 3. Shows how many steps past, then indexes `values` to derive from.

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

// The main `gl-gpgpu` state.
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
    type: ((extend.float.every(regl.hasExtension))? 'float' : 'half float'),
    // Configure macro hooks, global or per-shader.
    macros: {
        // No macros needed for the `vert` shader; all other macros generated.
        vert: false
    },
    // Prefix is usually recommended; use none here to check for naming clashes.
    pre: '',
    // Properties for each step of state, and each pass of each step.
    step: {
        // A fragment shader to compute each state step, with `gl-gpgpu` macros.
        // Vertex shaders can also be given.
        frag: stepFrag,
        // Macros are prepended to `frag` shader per-pass, cached in `frags`.
        frags: [],
        // Custom uniforms in addition to those `gl-gpgpu` provides.
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
            moveCap: regl.prop('props.moveCap'),
            source: regl.prop('props.source'),
            sink: regl.prop('props.sink'),
            g: regl.prop('props.g'),
            scale: regl.prop('props.scale'),

            // One option in these arrays is used, by Euler/Verlet respectively.
            spout: (_, { props: { spout: ss, useVerlet: u } }) => ss[+u],
            // drag: (_, { props: { drag: ds, useVerlet: u } }) => ds[+u]
        }
    },

    // Custom properties to be passed to shaders mixed in with `gl-gpgpu` ones.
    props: {
        // Set up the timer.
        timer: timer((timestep)?
                // Fixed-step (add-step).
                { step: timestep, dts: range(2, 0) }
                // Real-time (variable delta-time).
            :   { step: '-', now: () => regl.now()*1e3, dts: range(2, 0) }),

        // Speed up or slow down the passage of time.
        rate: 1,
        // Loop time over this period to avoid instability of parts of the demo.
        loop: 3e3,
        // A particle's lifetime range, and whether it's allowed to spawn.
        lifetime: [3e2, 4e3, +true],
        // Whether to use Verlet (midpoint) or Euler (forward) integration.
        useVerlet: +canVerlet,
        // A small number greater than 0; avoids speeds exploding.
        epsilon: 1e-5,
        // How faar a particle can move in any frame.
        moveCap: 4e-2,
        // Whether to invert particle flow towards rather than away from source.
        invert: false,
        // The position around which particles spawn.
        source: [0, 0, 0.4],
        // Sink position, and universal gravitational constant.
        sink: [
            // Sink position.
            0, 0, 0.6,
            // Universal gravitational constant (scaled).
            6.674e-11*5e10
        ],
        // Constant acceleration due to gravity; and whether to use it, uses
        // sink if not.
        g: [
            // Constant acceleration due to gravity.
            0, -9.80665, 0,
            // Whether to use it, uses sink if not.
            +false
        ],
        // For numeric accuracy, encoded as exponent `[b, p] => b*(10**p)`.
        scale: [1, -7],

        // One option in these arrays is used, by Euler/Verlet respectively.

        // The distance from the `source`, and speed, that particles spawn with.
        spout: [[0, 3e3], [0, 2e2]],
        // Drag coefficient.
        // drag: [range(3, 1e-3), range(3, 1e-1)]
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

const viewScale = ({ drawingBufferWidth: w, drawingBufferHeight: h }) =>
    Math.min(w, h);

// Reuse the GPGPU state, mix in drawing-specific state.
const drawState = {
    ...state,
    bound: drawBound,
    // Drawing, don't need to output any data; also don't need `frag` macros.
    macros: { 'output': 0, 'frag': 0 },
    drawProps: {
        // How many vertexes per form.
        form: clamp((form || 2), 1, 1+useLines),
        // Vertex counts by form; how many steps a form covers, for all entries.
        count: null,
        counts: drawCounts,
        // Which primitives can be drawn.
        primitive: null,
        primitives: [, 'points', 'lines'],
        // How wide the form is; to be scaled by `viewScale`.
        wide,

        // One option in these arrays is used, by Euler/Verlet respectively.

        // Speed-to-colour scaling, as `[multiply, power]`.
        pace: [[1e-3, 0.6], [3e2, 0.6]]
    },
    // Map everything similarly to the GPGPU step, `mapFlow` can be reused to
    // create new mappings with some additions for drawing.
    maps: mapFlow({
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
        pace: (_, { drawProps: { pace: p }, props: { useVerlet: u } }) => p[+u],

        pointSize: (c, { drawProps: { wide: w } }) =>
            clamp(w*viewScale(c), ...pointSizeDims)
    }),
    lineWidth: (c, { drawProps: { wide: w } }) =>
        clamp(w*viewScale(c), ...lineWidthDims),

    // Vertex counts by form; how many steps a form covers, for all entries.
    count: (_, { drawProps: { count: c, counts: cs, form: f } }) => c ?? cs[f],
    depth: { enable: true },
    blend: { enable: true, func: { src: 'one', dst: 'one minus src alpha' } },

    primitive: (_, { drawProps: { primitive: p, primitives: ps, form: f } }) =>
        p ?? ps[f]
};

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
    try {
        stepTime(state.props.timer);
        // Compute the next step of state.
        state.step.run();
        drawState.stepNow = state.stepNow+1-drawBound;
        regl.clear(clearView);
        draw(drawState);
    }
    catch(e) { toggleError(e); }
});

function stopEvent(e) {
    e.stopPropagation();
    e.preventDefault();
}

// Pause the spawning while pointer is held down.
let hold;

// Pause particles spawning.
canvas.addEventListener('contextmenu', (e) => {
    // Whether a particle's allowed to spawn.
    state.props.lifetime[2] = +false;
    hold = false;
    stopEvent(e);
});

// Toggle physics and graphics modes.
canvas.addEventListener((('onpointerup' in self)? 'pointerup'
        : (('ontouchend' in self)? 'touchend' : 'mouseup')), (e) => {
    // Unpause the spawning when pointer is released.
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
    const v = (canVerlet && (p.useVerlet = 1-p.useVerlet));
    const f = (form || (d.form = 1+(useLines && ((canVerlet)? v : d.form%2))));

    console.log('useVerlet', v, 'form', f,
        // See how this derives other properties.
        'count', drawCommand.count(0, drawState),
        'primitive', drawCommand.primitive(0, drawState));
});

// Move either the source or the sink, according to primary pointer.
canvas.addEventListener((('onpointermove' in self)? 'pointermove'
        : (('ontouchmove' in self)? 'touchmove' : 'mousemove')), (e) => {
    const { clientX: x, clientY: y, type, pointerType, isPrimary = true } = e;
    const { source: i, sink: o, invert } = state.props;
    const touch = ((type === 'touchmove') || (pointerType === 'touch'));
    // Move either source/sink, switch by primary/other pointers or inverting.
    const to = ((isPrimary)? ((invert)? o : i) : ((invert)? i : o));
    const size = Math.min(innerWidth, innerHeight);

    to[0] = (((x-((innerWidth-size)*0.5))/size)*2)-1;
    to[1] = -((((y-((innerHeight-size)*0.5))/size)*2)-1);
    // For touch devices, don't pause spawn if touch moves while held down.
    (touch && (hold = true));
});

// Switch primary pointer control between source and sink.
canvas.addEventListener('dblclick', (e) => {
    state.props.invert = !state.props.invert;
    stopEvent(e);
});

// Resize the canvas.
function resize() {
    canvas.width = innerWidth*pixelRatio;
    canvas.height = innerHeight*pixelRatio;
}

addEventListener('resize', resize);
resize();

module?.hot?.accept?.(() => location.reload());
