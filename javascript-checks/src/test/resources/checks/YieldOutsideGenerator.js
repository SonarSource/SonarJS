yield;     // Noncompliant {{Remove this "yield" expression or move it into a generator.}}

yield foo; // Noncompliant
var yield; // OK

function * generator() {
  yield;

  function notGenerator() {
    yield; // Noncompliant
//  ^^^^^

    for (var i in obj) {
      yield i; // Noncompliant
    }
  }
}
