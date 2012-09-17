switch (param) {
  case 0:
    break;
  default: // OK
    break;
}

switch (param) { // NOK
  case 1:
    break;
}

switch (param) {
  case 0:
    break;
  default: // NOK
    break;
  case 1:
    break;
}
