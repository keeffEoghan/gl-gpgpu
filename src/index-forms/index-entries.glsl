/**
 * The step and entry indexes corresponding to the number of entries and steps
 * for pairs of elements (e.g: lines linking each index's steps); as detailed in
 * the `indexForms` `JS` `function`.
 * Given the vertex index and number of entries; iterates steps-then-entries.
 *
 * Works out as 2 `remainDiv`:
 * `[(index%form)+floor(floor(index/form)/count), floor(index/form)%count]`
 * `[indexForm.s+floor(indexForm.t/count), indexForm.t%count]`
 * `[indexForm.s+stepEntry.t, stepEntry.s]`
 *
 * @see {@link index-forms}
 * @see {@link util/remain-div.glsl!}
 *
 * @param {float|int} `index` The index of a vertex; expects simple sequential
 *   index attribute.
 * @param {float|int} `count` How many entries are in each step of state.
 * @param {float|int} [`form`] How many steps of state each form covers.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *   correct data to draw the given `form` along each entry's steps of state;
 *   always a `vec2` if any operand is a `float`, an `ivec2` if all are `int`;
 *   iterates with `index` by steps-then-entries.
 */

#pragma glslify: remainDiv = require(../util/remain-div)

// Careful handling integer maths - decimals truncated.
ivec2 indexForms(int index, int count, int form) {
  ivec2 indexForm = remainDiv(index, form);
  ivec2 stepEntry = remainDiv(indexForm.t, count).ts;

  stepEntry.s += indexForm.s;

  return stepEntry;
}

vec2 indexForms(float index, float count, float form) {
  vec2 indexForm = remainDiv(index, form);
  vec2 stepEntry = remainDiv(indexForm.t, count).ts;

  stepEntry.s += indexForm.s;

  return stepEntry;
}

// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(count), int(form))` or
// `vec2(indexForms(int(index), int(count), int(form)))` instead.

vec2 indexForms(int index, float count, float form) {
  return indexForms(float(index), count, form);
}

vec2 indexForms(float index, int count, float form) {
  return indexForms(index, float(count), form);
}

vec2 indexForms(float index, float count, int form) {
  return indexForms(index, count, float(form));
}

vec2 indexForms(float index, int count, int form) {
  return indexForms(index, float(count), float(form));
}

vec2 indexForms(int index, float count, int form) {
  return indexForms(float(index), count, float(form));
}

vec2 indexForms(int index, int count, float form) {
  return indexForms(float(index), float(count), form);
}

// Expects pairs by default, though also works for single points and possibly
// useful for other forms.
// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(count))` or
// `vec2(indexForms(int(index), int(count)))` instead.

ivec2 indexForms(int index, int count) {
  return indexForms(index, count, 2);
}

vec2 indexForms(float index, float count) {
  return indexForms(index, count, 2.0);
}

vec2 indexForms(int index, float count) {
  return indexForms(float(index), count, 2.0);
}

vec2 indexForms(float index, int count) {
  return indexForms(index, float(count), 2.0);
}

#pragma glslify: export(indexForms);
