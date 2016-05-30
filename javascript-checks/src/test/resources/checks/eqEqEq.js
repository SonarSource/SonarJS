function sayHello() {
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
}
