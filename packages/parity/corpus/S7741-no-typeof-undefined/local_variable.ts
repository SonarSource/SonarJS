function configure(value?: string) {
  if (typeof value === 'undefined') {
    return 'missing';
  }

  return value;
}
