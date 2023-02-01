function bar(b: number, c: number) {
  if (b == 0) {
    // Noncompliant
    doOneMoreThing();
  } else {
    doOneMoreThing();
  }
}
