function ensureString(value: unknown) {
  if (typeof value !== 'string') {
    console.error(value);
    throw new Error('Expected a string');
  }
}
