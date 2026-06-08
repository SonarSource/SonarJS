function select(kind) {
  switch (kind) {
    case 'let':
      let value = 1;
      return value;
    default:
      function buildFallback() {
        return 2;
      }
      return buildFallback();
  }
}
