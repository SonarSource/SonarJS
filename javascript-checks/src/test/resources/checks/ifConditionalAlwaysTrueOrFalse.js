if (a === b) {    // OK
  doSomething();
}

if (true === b) { // OK
  doSomething();
}

if (true) {
  doSomething();  // NOK
}

if (false) {
  doSomething();  // NOK
}
