/**
 * The step and entry indexes corresponding to the steps and entries count for
 * pairs of elements (e.g: lines linking each entry's steps); as detailed in the
 * `indexForms` JS function.
 * Takes vertex index and steps count as input; iterates entries-then-steps.
 *
 * @see [readme]{@link ./readme.md}
 * @see [indexForms]{@link ./index.js#indexForms}
 * @see [remainDiv]{@link ../util/remain-div.glsl}
 *
 * @param {float|int} `index` The index of a vertex; expects simple sequential
 *     index attribute.
 * @param {float|int} `states` How many steps of state each entry has.
 * @param {float|int} [`form`] How many steps of state each form covers.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *     correct data to draw the given `form` along each entry's steps of state;
 *     always a `vec2` if any operand is a `float`, an `ivec2` if all are `int`;
 *     iterates with `index` by entries-then-steps.
 */

#pragma glslify: remainDiv = require(../util/remain-div)

// Careful handling integer maths - decimals truncated.
ivec2 indexForms(int index, int states, int form) {
    int f = form-1;
    ivec2 stepEntry = remainDiv(index, (states-f)*form);

    stepEntry.s = (stepEntry.s+f)/form;

    return stepEntry;
}

vec2 indexForms(float index, float states, float form) {
    vec2 stepEntry = remainDiv(index/form, states-form+1.0);

    stepEntry.s = ceil(stepEntry.s);

    return stepEntry;
}

// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(states), int(form))`
// or `vec2(indexForms(int(index), int(states), int(form)))` instead.

vec2 indexForms(int index, float states, float form) {
    return indexForms(float(index), states, form);
}

vec2 indexForms(float index, int states, float form) {
    return indexForms(index, float(states), form);
}

vec2 indexForms(float index, float states, int form) {
    return indexForms(index, states, float(form));
}

vec2 indexForms(float index, int states, int form) {
    return indexForms(index, float(states), float(form));
}

vec2 indexForms(int index, float states, int form) {
    return indexForms(float(index), states, float(form));
}

vec2 indexForms(int index, int states, float form) {
    return indexForms(float(index), float(states), form);
}

// Expects pairs by default, though also works for single points and possibly
// useful for other forms.
// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(states))` or
// `vec2(indexForms(int(index), int(states)))` instead.

ivec2 indexForms(int index, int states) {
    return indexForms(index, states, 2);
}

vec2 indexForms(float index, float states) {
    return indexForms(index, states, 2.0);
}

vec2 indexForms(int index, float states) {
    return indexForms(float(index), states, 2.0);
}

vec2 indexForms(float index, int states) {
    return indexForms(index, float(states), 2.0);
}

#pragma glslify: export(indexForms);
