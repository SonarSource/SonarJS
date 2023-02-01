function foo() {
  let str = 'str', num = 5;

  if (str === num) {
    // Noncompliant
    doOneMoreThing();
  } else {
    doOneMoreThing();
  }
}
