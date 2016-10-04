function sayHello(c) {
  if (c) {
    foo();
  }
  if (a == b) {     // Noncompliant {{Replace "==" with "===".}}
//      ^^
  }
  if (a != b) {     // Noncompliant {{Replace "!=" with "!==".}}
  }
  if (a === b) {    // OK
  }
  if (a !== b) {    // OK
  }
  if (a != null) {  // OK
  }
  if (a == null) {  // OK
  }
  if (null == a) {  // OK
  }
  if (null == null) {  // OK
  }
  foo(c);
}

function withTypes(a, b) {
  if (typeof a == "string" && typeof b == "string") { // OK x 2

    if (a == b) {     // OK
    }
    if (a != b) {     // OK
    }
    if (a === b) {    // OK
    }
    if (a !== b) {    // OK
    }
    if (a != null) {  // OK
    }
    if (a == null) {  // OK
    }
  }

  if (typeof a == "string" && typeof b == "number") {
    if (a == b) {     // Noncompliant
    }
    if (a === b) {    // OK
    }
  }

  if (typeof a == "string") {
    if (a == b) {     // Noncompliant
    }
    if (a === b) {    // OK
    }
  }

}

if (a == b) { // Noncompliant
}

function withTry() {
  try {
    foo();
  } catch(e) {}

  if (a == b) { // Noncompliant
  }
}
