/**
 * Convenience for setting up named `gpgpu` fields.
 */
export function toFields(fields, to = {}) {
  const values = to.values ??= [];
  const index = to.index ??= {};
  const aka = to.aka ??= [];

  values.length = aka.length = 0;

  (to.map = (fields.map ?? fields))
    .forEach((v, k) => aka[index[k] = values.push(v)-1] = k);

  return to;
}

export default toFields;
