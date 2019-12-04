# `gl-gpgpu`

GPGPU current/past state stepping, mappings for shaders/resources/inputs/outputs over minimal passes/resources - BYORenderer.

Aims to have loose drawing dependencies - for easier compatibility with any renderer which may rely on tracking the WebGL state (e.g: [`regl`](https://github.com/regl-project/regl/).
To handle resource creation and rendering, pass an API object for the needed callbacks (parameters match the `regl` API, but you may mix in whatever library you like).
