# Index Forms

Helpers to count and index the vertex data entries needed for different forms covering each entry's steps of state (e.g: pairs of line segments using [`gl.LINES`](https://webglfundamentals.org/webgl/lessons/webgl-points-lines-triangles.html)).

This approach is intended to link lines between or a point at each entry's steps of state, but could be adapted in other ways (e.g: if a data-texture contains more than one state, or entries are organised differently in a data-texture).

Some examples illustrating the mappings; for `index-states`, for a form of 2 (pairs of line segments), iterates entries-then-steps:
```javascript
// 2 entries, 3 steps, 8 indexes:
[0, 1, 2, 3, 4, 5, 6, 7]
// 2 lines, 2 segments each:
[[[0, 1], [1, 2]], [[0, 1], [1, 2]]]
// 2 lines of entry indexes:
[[[0, 0], [0, 0]], [[1, 1], [1, 1]]]
```
```javascript
// 2 entries, 4 steps, 12 indexes:
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
// 2 lines, 3 segments each:
[[[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [2, 3]]]
// 2 lines of entry indexes:
[[[0, 0], [0, 0], [0, 0]], [[1, 1], [1, 1], [1, 1]]]
```
```javascript
// 3 entries, 3 steps, 12 indexes:
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
// 3 lines, 2 segments each:
[[[0, 1], [1, 2]], [[0, 1], [1, 2]], [[0, 1], [1, 2]]]
// 3 lines of entry indexes:
[[[0, 0], [0, 0]], [[1, 1], [1, 1]], [[2, 2], [2, 2]]]
```
```javascript
// 1 entry, 2 steps, 2 indexes:
[0, 1]
// 1 line, 1 segment:
[[[0, 1]]]
// 2 lines of entry indexes:
[[[0, 0]]]
```
