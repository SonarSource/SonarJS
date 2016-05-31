if (a === b) {    // OK
  doSomething();
}

if (true === b) { // OK
  doSomething();
}

if (true) {       // Noncompliant {{Remove this "if" statement.}}
//  ^^^^
  doSomething();
}

if (false) {      // Noncompliant
  doSomething();
}
