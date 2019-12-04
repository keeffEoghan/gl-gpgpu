# Notes

## To-do

- Try rendering state data directly into a vertex attribute buffer, alongside or instead of texture uniform?
    - Would remove need for texture sampling in cases where the calculations only need the local data lookup.
    - [Updating buffer dynamically/streaming](https://github.com/regl-project/regl/blob/gh-pages/API.md#buffer-subdata).
    - [Reading from FBO into buffer](https://github.com/regl-project/regl/blob/gh-pages/API.md#reading-pixels).
