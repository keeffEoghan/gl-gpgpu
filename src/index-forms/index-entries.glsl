/**
 * The step and entry indexes corresponding to the number of indexes and steps
 * for pairs of elements (e.g: lines linking each index's steps); as detailed in
 * the `indexForms` `JS` `function`.
 * Given the vertex index and number of indexes; iterates steps-then-indexes.
 *
 * Works out as 2 `remainDiv`:
 * `[(index%form)+floor(floor(index/form)/indexes), floor(index/form)%indexes]`
 * `[indexForm.s+floor(indexForm.t/indexes), indexForm.t%indexes]`
 * `[indexForm.s+stepEntry.t, stepEntry.s]`
 *
 * @see {@link index-forms}
 * @see {@link util/remain-div.glsl!}
 *
 * @param {float|int} `index` The index of a vertex; expects simple sequential
 *   index attribute.
 * @param {float|int} `indexes` How many indexes are in each step of state.
 * @param {float|int} [`form`] How many steps of state each form covers.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *   correct data to draw the given `form` along each entry's steps of state;
 *   always a `vec2` if any operand is a `float`, an `ivec2` if all are `int`;
 *   iterates with `index` by steps-then-indexes.
 */

#pragma glslify: remainDiv = require(../util/remain-div)

// Careful handling integer maths - decimals truncated.
ivec2 indexForms(int index, int indexes, int form) {
  ivec2 indexForm = remainDiv(index, form);
  ivec2 stepEntry = remainDiv(indexForm.t, indexes).ts;

  stepEntry.s += indexForm.s;

  return stepEntry;
}

vec2 indexForms(float index, float indexes, float form) {
  vec2 indexForm = remainDiv(index, form);
  vec2 stepEntry = remainDiv(indexForm.t, indexes).ts;

  stepEntry.s += indexForm.s;

  return stepEntry;
}

// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(indexes), int(form))` or
// `vec2(indexForms(int(index), int(indexes), int(form)))` instead.

vec2 indexForms(int index, float indexes, float form) {
  return indexForms(float(index), indexes, form);
}

vec2 indexForms(float index, int indexes, float form) {
  return indexForms(index, float(indexes), form);
}

vec2 indexForms(float index, float indexes, int form) {
  return indexForms(index, indexes, float(form));
}

vec2 indexForms(float index, int indexes, int form) {
  return indexForms(index, float(indexes), float(form));
}

vec2 indexForms(int index, float indexes, int form) {
  return indexForms(float(index), indexes, float(form));
}

vec2 indexForms(int index, int indexes, float form) {
  return indexForms(float(index), float(indexes), form);
}

// Expects pairs by default, though also works for single points and possibly
// useful for other forms.
// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(indexes))` or
// `vec2(indexForms(int(index), int(indexes)))` instead.

ivec2 indexForms(int index, int indexes) {
  return indexForms(index, indexes, 2);
}

vec2 indexForms(float index, float indexes) {
  return indexForms(index, indexes, 2.0);
}

vec2 indexForms(int index, float indexes) {
  return indexForms(float(index), indexes, 2.0);
}

vec2 indexForms(float index, int indexes) {
  return indexForms(index, float(indexes), 2.0);
}

#pragma glslify: export(indexForms);
