function f(a: string) {
  if (a.indexOf("a") >= 0) { // OK

  }
  if (a.indexOf("b") > 0) { // Noncompliant

  }
}
