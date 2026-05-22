function valid(first, { second: alias }, ...rest) {
  return [first, alias, rest];
}
