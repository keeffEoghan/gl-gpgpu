/**
 * The step and entry indexes corresponding to the entries and steps count for
 * pairs of elements (e.g: lines linking each entry's steps); as detailed in the
 * `indexForms` JS function.
 * Takes vertex index and entries count as input; iterates steps-then-entries.
 *
 * @see [readme]{@link ./readme.md}
 * @see [indexForms]{@link ./index.js#indexForms}
 * @see [remainDiv]{@link ../util/remain-div.glsl}
 *
 * @param {float|int} `index` The index of a vertex; expects simple sequential
 *     index attribute.
 * @param {float|int} `entries` How many entries are in each step of state.
 * @param {float|int} [`form`] How many steps of state each form covers.
 *
 * @returns {vec2|ivec2} The step and entry index, respectively, to look up the
 *     correct data to draw the given `form` along each entry's steps of state;
 *     always a `vec2` if any operand is a `float`, an `ivec2` if all are `int`;
 *     iterates with `index` by steps-then-entries.
 */

#pragma glslify: remainDiv = require(../util/remain-div)

// [(index%form)+floor(floor(index/form)/entries), floor(index/form)%entries]
// [if.s+floor(if.t/entries), if.t%entries]
// [if.s+ifc.t, ifc.s]

ivec2 indexForms(int index, int entries, int form) {
    // Careful handling integer maths - decimals truncated.
    ivec2 entryForm = remainDiv(index, form);
    ivec2 stepEntry = remainDiv(entryForm.t, entries).ts;

    stepEntry.s += entryForm.s;

    return stepEntry;
}

vec2 indexForms(float index, float entries, float form) {
    vec2 entryForm = remainDiv(index, form);
    vec2 stepEntry = remainDiv(entryForm.t, entries).ts;

    stepEntry.s += entryForm.s;

    return stepEntry;
}

// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(entries), int(form))` or
// `vec2(indexForms(int(index), int(entries), int(form)))` instead.

vec2 indexForms(int index, float entries, float form) {
    return indexForms(float(index), entries, form);
}

vec2 indexForms(float index, int entries, float form) {
    return indexForms(index, float(entries), form);
}

vec2 indexForms(float index, float entries, int form) {
    return indexForms(index, entries, float(form));
}

vec2 indexForms(float index, int entries, int form) {
    return indexForms(index, float(entries), float(form));
}

vec2 indexForms(int index, float entries, int form) {
    return indexForms(float(index), entries, float(form));
}

vec2 indexForms(int index, int entries, float form) {
    return indexForms(float(index), float(entries), form);
}

// Expects pairs by default, though also works for single points and possibly
// useful for other forms.
// Mixed-type overloads assume higher accuracy is desired; if less computation
// with `int` is desired, use `indexForms(int(index), int(entries))` or
// `vec2(indexForms(int(index), int(entries)))` instead.

ivec2 indexForms(int index, int entries) {
    return indexForms(index, entries, 2);
}

vec2 indexForms(float index, float entries) {
    return indexForms(index, entries, 2.0);
}

vec2 indexForms(int index, float entries) {
    return indexForms(float(index), entries, 2.0);
}

vec2 indexForms(float index, int entries) {
    return indexForms(index, float(entries), 2.0);
}

#pragma glslify: export(indexForms);
