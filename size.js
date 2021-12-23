import map from '@epok.tech/fn-lists/map';
import range from '@epok.tech/fn-lists/range';

/**
 * Returns the given width, for various parameters in order of precedence.
 *
 * @see [getState]{@link ./state.js#getState}
 *
 * @param {number|object<number>|array<number>} size Numeric size (width), or
 *     an object or array containing it.
 * @param {number} [size.width] Width; supersedes following arguments.
 * @param {number} [size.w] Alias of width; supersedes following arguments.
 * @param {number} [size.x] Alias of width; supersedes following arguments.
 * @param {object<number>|array<number>|number} [size.shape] The shape, of size
 *     (width) information; supersedes following arguments.
 * @param {object<number>|array<number>|number} [size.size] The size, of size
 *     (width) information; supersedes following arguments.
 * @param {number} [size.side] Width and height; supersedes following arguments.
 * @param {number} [size.0] Alias of width (index 0); supersedes giving `size`.
 *
 * @returns {number} The width as given in one of the expected ways.
 */
export const getWidth = ({ width, w, x, shape, size, side, 0: a }) =>
    (width ?? w ?? x ??
    (shape && getWidth(shape)) ?? (size && getWidth(size)) ??
    side ?? a ?? size);

/**
 * Returns the given height, for various parameters in order of precedence.
 *
 * @see [getState]{@link ./state.js#getState}
 *
 * @param {number|object<number>|array<number>} size Numeric size (height), or
 *     an object or array containing it.
 * @param {number} [size.height] Height; supersedes following arguments.
 * @param {number} [size.h] Height; supersedes following arguments.
 * @param {number} [size.y] Height; supersedes following arguments.
 * @param {object<number>|array<number>|number} [size.shape] The shape, of size
 *     (height) information; supersedes following arguments.
 * @param {object<number>|array<number>|number} [size.size] The size, of size
 *     (height) information; supersedes following arguments.
 * @param {number} [size.side] Width and height; supersedes following arguments.
 * @param {number} [size.1] Alias of height (index 1); supersedes giving `size`.
 *
 * @returns {number} The height as given in one of the expected ways.
 */
export const getHeight = ({ height, h, y, shape, size, side, 1: a }) =>
    (height ?? h ?? y ??
    (shape && getHeight(shape)) ?? (size && getHeight(size)) ??
    side ?? a ?? size);

/**
 * Gives the number of indexes to draw a full state, for various parameters.
 * Effectively equivalent to `gl_VertexID` in WebGL2.
 *
 * @see getWidth
 * @see getHeight
 * @see [getState]{@link ./state.js#getState}
 *
 * @param {number|object<number>|array<number>} size Numeric size information of
 *     data resources, or an object or array containing it; or width if
 *     height is given as a second parameter. See `getWidth` and `getHeight`.
 * @param {number} [size.count] The number of entries of each data-texture.
 *
 * @param {number} [height=1] The height of each data-texture.
 *
 * @returns {number} The number of indexes needed to draw a full state; each
 *     entry of a data-texture (its area, equivalent to `state.size.count`).
 */
export const countDrawIndexes = (size, height) =>
    (size.count ?? getWidth(size)*getHeight(height ?? 1));

/**
 * Gives the array of indexes needed to draw a full state.
 *
 * @param {number|object<number>} size The number of entries in each
 *     data-texture; or an object of size/type information on data resources.
 *
 * @returns {array<number>} An array of indexes for drawing all data-texture
 *     entries, numbered `0` to `size-1`.
 */
export const getDrawIndexes = (size) => map((_, i) => i,
    range(Number.isInteger(size)? size : countDrawIndexes(size)), 0);

/**
 * 2 raised to the given numeric power, or null if not given.
 *
 * @param {number} [scale] The power to raise 2 to.
 *
 * @returns 2 raised to the given numeric power, or null if not given.
 */
export const getScaled = (scale) => ((Number.isFinite(scale))? 2**scale : null);
