/** @module */

import map from '@epok.tech/fn-lists/map';
import range from '@epok.tech/fn-lists/range';

const { isFinite } = Number;

/**
 * Returns the given width, for various properties in order of precedence.
 *
 * @see {@link state.getState}
 *
 * @param {number|object<number>|array<number>} v Numeric size (width), or an
 *   `object` or `array` containing it; used if no non-null property is found.
 * @param {number} [value.width] Width; supersedes following arguments.
 * @param {number} [value.w] Alias of `width`; supersedes following arguments.
 * @param {number} [value.x] Alias of `width`; supersedes following arguments.
 * @param {object<number>|array<number>|number} [value.shape] Shape (width);
 *   supersedes following arguments.
 * @param {object<number>|array<number>|number} [value.size] Size (width);
 *   supersedes following arguments.
 * @param {number} [value.side] Width and height; supersedes following arguments.
 * @param {number} [value.0] Alias of `width` (index 0); supersedes `value`.
 *
 * @returns {number} The width as given in one of the expected properties, or
 *   the given `value`.
 */
export function getWidth(value) {
  const { width, w, x, shape, size, side, 0: v0 } = value;

  return width ?? w ?? x ?? (shape && getWidth(shape)) ??
    (size && getWidth(size)) ?? side ?? v0 ??
    ((isFinite(value))? value : null);
}

/**
 * Returns the given height, for various properties in order of precedence.
 *
 * @see {@link state.getState}
 *
 * @param {number|object<number>|array<number>} v Numeric size (height), or an
 *   `object` or `array` containing it; used if no non-null property is found.
 * @param {number} [value.height] Height; supersedes following arguments.
 * @param {number} [value.h] Alias of `height`; supersedes following arguments.
 * @param {number} [value.y] Alias of `height`; supersedes following arguments.
 * @param {object<number>|array<number>|number} [value.shape] Shape (height);
 *   supersedes following arguments.
 * @param {object<number>|array<number>|number} [value.size] Size (height);
 *   supersedes following arguments.
 * @param {number} [value.side] Width and height; supersedes following arguments.
 * @param {number} [value.1] Alias of `height` (index 1); supersedes `value`.
 *
 * @returns {number} The height as given in one of the expected properties, or
 *   the given `value`.
 */
export function getHeight(value) {
  const { height, h, y, shape, size, side, 1: v1 } = value;

  return height ?? h ?? y ?? (shape && getHeight(shape)) ??
    (size && getHeight(size)) ?? side ?? v1 ??
    ((isFinite(value))? value : null);
}

/**
 * Gives the number of indexes to draw a full state, for various parameters.
 * Effectively equivalent to `gl_VertexID` in `WebGL2`.
 *
 * @see {@link getWidth}
 * @see {@link getHeight}
 * @see {@link state.getState}
 *
 * @param {number|object<number>|array<number>} size Numeric size information of
 *   data resources, or an `object` or `array` containing it; width if height is
 *   given as a second parameter. See `getWidth` and `getHeight`.
 * @param {number} [size.count] The number of entries of each data-texture.
 * @param {number} [height=1] The height of each data-texture.
 *
 * @returns {number} The number of indexes needed to draw a full state; each
 *   entry of a data-texture (its area, equivalent to `state.size.count`).
 */
export const countDrawIndexes = (size, height) =>
  size.count ?? getWidth(size ?? 1)*getHeight(height ?? 1);

/**
 * Gives the array of indexes needed to draw a full state.
 *
 * @param {number|object<number>} size The number of entries in each
 *   data-texture; or an object of size/type information on data resources.
 *
 * @returns {array<number>} An array of indexes for drawing all data-texture
 *   entries, numbered `0` to `size-1`.
 */
export const getDrawIndexes = (size) => map((_, i) => i,
  range(Number.isInteger(size)? size : countDrawIndexes(size)), 0);

/**
 * 2 raised to the given numeric power, or `null` if not given.
 *
 * @param {number} [scale] The power to raise 2 to.
 *
 * @returns 2 raised to the given numeric power, or `null` if not given.
 */
export const getScaled = (scale) => ((Number.isFinite(scale))? 2**scale : null);
