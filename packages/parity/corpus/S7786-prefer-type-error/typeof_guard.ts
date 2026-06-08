function ensureString(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Expected a string');
  }
}
