function select(kind) {
  switch (kind) {
    case 'wrapped': {
      let value = 1;
      return value;
    }
    default:
      var fallback = 2;
      return fallback;
  }
}
