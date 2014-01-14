switch (a) {
  case 0:
  case 1:
    case2:              // NOK
        doSomething();
    break;
}

switch (a) {
  case 0:
    break;
  case 1:
    label:while (a) {   // NOK
      break label;
    }
    break;
}

switch (a) {
  case 0:
  case 1:
  {
    label:while (b) {   // NOK
      doSomething(b);
      break label;
    }
  }
}

switch (a) {            // OK
  case 0:
  case 1:
    while(b) {
    }
}
