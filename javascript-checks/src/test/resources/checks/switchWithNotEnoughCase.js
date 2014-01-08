switch (a) {         // NOK
  case 1:
    doSomething();
    break;
  default:
    doSomething();
}

switch (a) {         // NOK

}

switch (a) {         // OK
  case 1:
  case 2:
    break;
  default:
    doSomething();
    break;
}

switch (a) {         // OK
  case 1:
    break;
  default:
    doSomething();
    break;
  case 2:
}
