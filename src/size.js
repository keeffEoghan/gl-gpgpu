/**
 * @module
 * @category JS
 */

import map from '@epok.tech/fn-lists/map';
import range from '@epok.tech/fn-lists/range';

const { isFinite, isInteger } = Number;

/**
 * Returns the given width, for various properties in order of precedence.
 *
 * @see {@link data.toData}
 *
 * @param {object} value Size (width) `number`, or an `object` containing it.
 * @param {number} [value.width] Width; supersedes further aliases.
 * @param {number} [value.w] Alias of `width`; supersedes further aliases.
 * @param {number} [value.x] Alias of `width`; supersedes further aliases.
 * @param {object} [value.shape] Shape (width) `number`, or an `object`
 *   containing it; supersedes further aliases.
 * @param {object} [value.size] Size (width) `number`, or an `object`
 *   containing it; supersedes further aliases.
 * @param {number} [value.side] Width and height; supersedes further aliases.
 * @param {number} [value.ʼ0ʼ] Alias of `width`; supersedes `value` itself.
 *
 * @returns {number} The width as given in one of the expected properties, or
 *   any given `value` number, or `null`ish if no width could be resolved.
 */
export function getWidth(value) {
  const { width, w, x, shape, size, side, 0: v0 } = value;

  return width ?? w ?? x ??
    (shape && getWidth(shape)) ?? (size && getWidth(size)) ??
    side ?? v0 ?? ((isFinite(value))? value : null);
}

/**
 * Returns the given height, for various properties in order of precedence.
 *
 * @see {@link data.toData}
 *
 * @param {object} value Size (height) `number`, or an `object` containing it.
 * @param {number} [value.height] Height; supersedes further aliases.
 * @param {number} [value.h] Alias of `height`; supersedes further aliases.
 * @param {number} [value.y] Alias of `height`; supersedes further aliases.
 * @param {object} [value.shape] Shape (height) `number`, or an `object`
 *   containing it; supersedes further aliases.
 * @param {object} [value.size] Size (height) `number`, or an `object`
 *   containing it; supersedes further aliases.
 * @param {number} [value.side] Width and height; supersedes further aliases.
 * @param {number} [value.ʼ1ʼ] Alias of `height`; supersedes `value` itself.
 *
 * @returns {number} The height as given in one of the expected properties, or
 *   any given `value` number, or `null`ish if no height could be resolved.
 */
export function getHeight(value) {
  const { height, h, y, shape, size, side, 1: v1 } = value;

  return height ?? h ?? y ??
    (shape && getHeight(shape)) ?? (size && getHeight(size)) ??
    side ?? v1 ?? ((isFinite(value))? value : null);
}

/**
 * Gives the number of indexes to draw a full state, for various parameters.
 * Effectively equivalent to `gl_VertexID` in `WebGL2`.
 *
 * @see {@link getWidth}
 * @see {@link getHeight}
 * @see {@link data.toData}
 *
 * @param {object} [size=1] Size `number` of data resources, or an `object`
 *   containing it; width if `height` is given as a second parameter.
 *   See `getWidth` and `getHeight`.
 * @param {number} [size.indexes] The `number` of entries of data resources.
 * @param {object} [height=1] Height `number` of data resources, or an `object`
 *   containing it.
 *
 * @returns {number} The number of indexes needed to draw a full state; each
 *   entry of a data-texture (its area, equivalent to `state.size.indexes`).
 */
export const countDrawIndexes = (size = 1, height = 1) =>
  size?.indexes ?? (getWidth(size) ?? 1)*(getHeight(height) ?? 1);

/**
 * Gives the array of indexes needed to draw a full state.
 *
 * @param {object} size The `number` of entries in each data-texture; or an
 *   `object` of size/type of data resources.
 *
 * @returns {array.<number>} An array of indexes for drawing all data-texture
 *   entries, numbered `0` to `size-1`.
 */
export const getDrawIndexes = (size) =>
  map((_, i) => i, range(isInteger(size)? size : countDrawIndexes(size)), 0);

/**
 * 2 raised to the given numeric power, or `null` if not given.
 *
 * @param {number} [scale] The power to raise 2 to.
 *
 * @returns 2 raised to the given numeric power, or `null` if not given.
 */
export const getScaled = (scale) => ((isFinite(scale))? 2**scale : null);
