function foo(b?: boolean) {
  if (b) {
    return bar();
  }
  return baz();
}
