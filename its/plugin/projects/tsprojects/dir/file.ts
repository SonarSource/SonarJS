function f(x: number) {
  if (x === 0) { // Noncompliant
    g();
  } else {
    g();
  }
}
