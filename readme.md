# `gl-gpgpu`

[![GPGPU particles demo](./snap/demo-particles-regl.png)](https://epok.tech/gl-gpgpu "GPGPU particles demo")

[GPGPU state-stepping](#gpgpu-state-stepping) - maps optimal draw passes, shaders, GL resources, inputs, outputs; lets you focus on your logic - [BYORenderer](#byorenderer).

## Installation

Install from [`npm`](https://www.npmjs.com/package/@epok.tech/gl-gpgpu) using:
```bash
npm install @epok.tech/gl-gpgpu
```
or:
```bash
yarn add @epok.tech/gl-gpgpu
```

## Usage

[See the demo](https://epok.tech/gl-gpgpu) and [its source code](https://github.com/keeffEoghan/gl-gpgpu/tree/master/demo/particles-regl) or [video](https://youtu.be/ddt3YA2J1ys) - below is shown a [partial example of GPGPU logic setup](#partial-example).

## GPGPU State-Stepping

GPGPU (General-Purpose Graphics Processing Unit) methods typically use textures as 2D (or 3D) memory buffers to perform arbitrary computation on the highly-parallel GPU in shaders.

This involves reading existing states from past buffers, writing new states into the next buffers, and keeping track of the mappings of each piece of data in memory.

When the variety of capabilities across myriad devices also comes into play, managing and mapping logic optimally across the available resources on each platform quickly becomes an arduous plumbing task - `gl-gpgpu` aims to handle all this work for you.

Given a simple description of your logic and the platform's capabilities, `gl-gpgpu` creates [easily-customisable](#customisable-components) mappings and resources which allow your logic to run optimally:
- Logic is declaratively described as state values, and how new states derive from past states.
- Resources are given from the `WebGL` API or library you use, making best use of each platform's capabilities to run your logic in as few passes and lookups as possible.

You are left free to focus on your logic, using `gl-gpgpu` macro flags and shader inputs and outputs (all safely and customisably namespaced), which allow you to easily:
- Split your code into separate concerns, executed for you in as few passes as possible.
- Look up and store states, rearranged for you into as few reads and writes as possible.

The `gl-gpgpu` mappings make a good, flexible base upon which to build complex and expressive GPGPU processes and abstractions, without getting mired in low-level resource management.

## BYORenderer

Bring Your Own Renderer to use with `gl-gpgpu`, which can hook into any given `WebGL` renderer API for easy compatibility.

To handle resource creation and rendering, pass an API object for the needed hooks - parameters match the functional [`regl` API](https://github.com/regl-project/regl/), but you may mix in whatever tools you like by providing hook functions which provide compatible responses.

Ample descriptive metadata and information are provided to your hooks, while assumptions or alterations of their responses are avoided - so you can connect `gl-gpgpu` to the underlying graphics implementation however you wish.

## Customisable Components

All `gl-gpgpu` modules may be used in the given main process structure, or imported and used piecemeal, or overridden via the state properties.

Many configurations and hooks are provided into each part of the process.

This offers a deeply-customisable API, with few constraints, assumptions, or opinions of how to structure your code.

## Constant or Arbitrary Lookups

Choose to use distinct data textures for each part of state, or merge all states into one data texture upon each pass - depending on whether you want to look up states arbitrarily or by constant expressions (respectively), and platform capabilities and performance considerations.

## WebGL Versions

This technique is best-suited to `WebGL1` - it is compatible with `WebGL2` too, including the `sampler3D` and `sampler2DArray` types, as well as the usual `sampler2D`.

However, [transform-feedback handles similar features natively](https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html#first-example-particles), using buffers rather than textures - this is a better option in many cases, so it's usually recommended to check the `WebGL` version to use either a `gl-gpgpu` or a `WebGL2` transform-feedback implementation.

## Partial Example

`JavaScript` setup `index.js`:

```javascript
import gpgpu from '@epok.tech/gl-gpgpu';

import frag from './step.frag.glsl';

// The main `gl-gpgpu` state.
const state = gpgpu(regl, {
  // Logic given as state values, `gl-gpgpu` maps optimal inputs and outputs.
  maps: {
    // How many state values (channels) are tracked independently of others.
    // The order here is the order used in the shaders and generated macros, but
    // for optimal lookups may be `packed` into channels/textures/passes
    // differently.
    values: [
      // Position value, uses 3 channels.
      3,
      // Motion value, uses 3 channels.
      3,
      // Life value, uses 1 channel.
      1
    ],
    // How state values map to any past state values they derive from.
    // Denoted as an array, nested 1-3 levels deep:
    // 1. In `values` order, indexes `values` to derive from, 1 step past.
    // 2. Indexes `values` to derive from, 1 step past.
    // 3. Shows how many steps past, then indexes `values` to derive from.
    derives: [
      // Position value derives from:
      [
        // Position, 2 steps past.
        [1, 0],
        // Position, 1 step past.
        0,
        // Motion, 1 step past.
        1,
        // Life, 1 step past.
        2
      ],
      // Motion value derives from:
      [
        // Motion, 1 step past.
        1,
        // Life, 1 step past.
        2,
        // Position, 1 step past.
        0
      ],
      // Life value derives from:
      [
        // Life, last step past.
        [1, 2],
        // Life, 1 step past.
        2
      ]
    ]
  },
  // How many steps of state to track.
  steps: 5,
  // How many states are bound to frame-buffer outputs at any step.
  bound: 1,
  // How many entries to track, here encoded as the power-of-2 size per side
  // of the data texture: `(2**scale)**2`; can also be given in other ways.
  scale: 10,
  // Whether to merge states into one texture; separate textures if not given.
  merge: true,
  // Data type according to platform capabilities.
  type: 'float',
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
    frag,
    // Prepended macros to `frag` shader per-pass and cache in `frags`.
    frags: [],
    // Custom uniforms in addition to those `gl-gpgpu` provides.
    uniforms: {}
  }
});

// Output of this example test:

const s = JSON.stringify;

// How `values` are `packed` to fit texture channels efficiently.
// `values` (referred to by index)
s(state.maps.values) === s([3, 3, 1]);
// `packed` (indexes `values`)
s(state.maps.packed) === s([0, 2, 1]);
// `textures` (indexes `values`)
s(state.maps.textures) === s([[0, 2], [1]]);
// `valueToTexture` (indexes `textures`)
s(state.maps.valueToTexture) === s([0, 1, 0]);

// `valueToTexture` (indexes `textures`)
((state.size.count === 1048576) &&
  (state.size.count === (2**10)**2) &&
  (state.size.count === (2**state.scale)**2) &&
  (state.size.count === state.size.width*state.size.height));

// Compute the next step of state.
state.step.run();
```

`GLSL` fragment shader logic `step.frag.glsl`:

```glsl
precision highp float;

// Setting up the macros and aliases `gl-gpgpu` provides.

// Note that these `texture_i`/`channels_i`/`reads_i_j` indexes correspond to a
// value at that index in the `values`/`derives` arrays provided to `gl-gpgpu`;
// they are defined here to match that arrangement.

// The texture channels each of the `values` is stored in.
#define positionChannels channels_0
#define motionChannels channels_1
#define lifeChannels channels_2

// Set up sampling logic via `gl-gpgpu` macro.
useSamples

// Set up minimal texture reads logic; only read what a value with a currently
// bound output `derives` from other `values` for its next state.
// See `derives` for indexing `reads_${bound value index}_${derives index}`.
#ifdef output_0
  #define positionOutput output_0
  useReads_0
  #define positionReadPosition0 reads_0_0
  #define positionReadPosition1 reads_0_1
  #define positionReadMotion reads_0_2
  #define positionReadLife reads_0_3
#endif
#ifdef output_1
  #define motionOutput output_1
  useReads_1
  #define motionReadMotion reads_1_0
  #define motionReadLife reads_1_1
  #define motionReadPosition reads_1_2
#endif
#ifdef output_2
  #define lifeOutput output_2
  useReads_2
  #define lifeReadLifeLast reads_2_0
  #define lifeReadLife1 reads_2_1
#endif

// The main shader.

// States from `gl-gpgpu`; in separate textures or merged.
#ifdef mergedStates
  uniform sampler2D states;
#else
  uniform sampler2D states[stepsPast*textures];
#endif

// The current step from `gl-gpgpu`.
uniform float stepNow;

// Any custom input logic...

void main() {
  // Sample the desired state values - creates the `data` array.
  tapState(uv)

  // Read values.

  #ifdef positionOutput
    vec3 position0 = data[positionReadPosition0].positionChannels;
  #endif

  // If reads all map to the same value sample, any of them will do.
  #if defined(positionOutput) || defined(motionOutput)
    #if defined(positionOutput)
      #define readMotion positionReadMotion
      #define readPosition positionReadPosition1
    #elif defined(motionOutput)
      #define readMotion motionReadMotion
      #define readPosition motionReadPosition
    #endif

    vec3 position1 = data[readPosition].positionChannels;
    vec3 motion = data[readMotion].motionChannels;
  #endif

  // If reads all map to the same value sample, any of them will do.
  #if defined(positionOutput)
    #define readLife positionReadLife
  #elif defined(lifeOutput)
    #define readLife lifeReadLife
  #elif defined(motionOutput)
    #define readLife motionReadLife
  #endif

  float life = data[readLife].lifeChannels;

  #ifdef lifeOutput
    float lifeLast = data[lifeReadLifeLast].lifeChannels;
  #endif

  // Update and output values.
  // Note that the update/output logic components within each `#if` macro
  // block from `gpgpu` are independent modules, as the `gpgpu` macros
  // determine whether they're executed across one or more passes - they could
  // also be coded in separate files called from here, however they're coded
  // inline here for brevity, relevance, and easy access to shared variables.
  #ifdef positionOutput
    // Any custom position logic...

    // Output the next position value to its channels in the state texture.
    positionOutput = vec3();
  #endif
  #ifdef motionOutput
    // Any custom motion logic...

    // Output the next motion value to its channels in the state texture.
    motionOutput = vec3();
  #endif
  #ifdef lifeOutput
    // Any custom life logic...

    // Output the next life value to its channels in the state texture.
    lifeOutput = float();
  #endif
}
```
