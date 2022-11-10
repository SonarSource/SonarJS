function foo(b: number) {
  //
  //
  if (b == 0) { // Noncompliant
    doOneMoreThing();
  } else {
    doOneMoreThing();
  }
}
