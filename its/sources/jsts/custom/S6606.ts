function foo(bar: boolean | undefined, baz: string) {
  return bar || baz; // FP
}