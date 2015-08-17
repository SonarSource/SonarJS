switch (param) {
  case 0: // OK
  case 1: // OK
    break;
  case 2: // OK
    return;
  case 3: // OK
    throw new Error();
  case 4: // NOK
    doSomething();
  case 5: // OK
    continue;
  default: // OK
    doSomethingElse();
}

switch (param) {
  default: // NOK
    doSomething();
  case 0: // OK
    doSomethingElse();
}
