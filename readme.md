# `gl-gpgpu`

GPGPU state-stepping: maps minimal draw passes, shaders, GL resources, inputs, outputs. BYORenderer.

Aims to have loose drawing dependencies - for easier compatibility with any renderer which may rely on tracking the WebGL state (e.g: [`regl`](https://github.com/regl-project/regl/)).
To handle resource creation and rendering, pass an API object for the needed callbacks (parameters match the `regl` API, but you may mix in whatever library you like).

The modules and many hooks may be used as given, or piecemeal, or overridden.

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

[See the demo](https://epok.tech/gl-gpgpu) and [its source code](https://github.com/keeffEoghan/gl-gpgpu/tree/master/example-particles).
