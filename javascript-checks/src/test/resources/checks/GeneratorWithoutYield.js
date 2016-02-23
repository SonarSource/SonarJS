function * foo() {  // Noncompliant [[sc=1;ec=15]] {{Add a "yield" statement to this generator.}}
  return 1;
}

var foo = function * () { // Noncompliant [[sc=11;ec=21]]
}
var foo = function * bar () { // Noncompliant [[sc=11;ec=25]]
}

class A {
  *foo() {      // Noncompliant [[sc=3;ec=7]]
  }
}

function * foo() {  // Noncompliant

  function * bar() {  // OK
    yield 1;
  }
}

