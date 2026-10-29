exports.compilerOptionsToJson = (ts, options) => {
  const result = {};
  const optionName = (type, value) => {
    if (!(type instanceof Map)) return value;
    const name = [...type].find(([, candidate]) => candidate === value)?.[0];
    if (name === undefined) throw new Error(`Cannot translate compiler option value ${value}`);
    return name;
  };
  for (const declaration of ts.optionDeclarations) {
    const value = options[declaration.name];
    if (value === undefined) continue;
    result[declaration.name] =
      declaration.type === 'list'
        ? value.map(item => optionName(declaration.element.type, item))
        : optionName(declaration.type, value);
  }
  return result;
};
