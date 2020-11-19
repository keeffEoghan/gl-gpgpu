# `gl-gpgpu`

GPGPU current/past state-stepping - map minimal passes of shaders, GL resources, inputs, outputs - BYORenderer.

Aims to have loose drawing dependencies - for easier compatibility with any renderer which may rely on tracking the WebGL state (e.g: [`regl`](https://github.com/regl-project/regl/).
To handle resource creation and rendering, pass an API object for the needed callbacks (parameters match the `regl` API, but you may mix in whatever library you like).

The modules and many hooks may be used as given, or piecemeal, or overridden.
