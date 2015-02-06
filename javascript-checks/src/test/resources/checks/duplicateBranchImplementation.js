if (a) {
  first();
} else {                 // NOK
  first();
}

if (a) {
  first();
} else if (a) {          // NOK
  first();
}

if (a) {
  first();
} else if (a) {
  second();
} else if (a) {          // NOK
  first();
}

if (a) {
  first();
} else if (a) {          // NOK
  first();
} else if (a) {
  second();
}

switch (a) {
  case 1:
    first();
    break;
  default:               // NOK
    first();
}

switch (a) {
  case 1:
    first();
    break;
  case 2:                // NOK
    first();
    break;
  default:
}

switch (a) {
  case 1:
    first();
    break;
  case 2:
    second();
    break;
  default:               // NOK
    first();
}

switch (a) {
  case 1:
    first();
    break;
  case 2:                // NOK
    first();
    break;
  case 3:
    second();
    break;
  default:
}

switch (a) {
  case 1:
    first();
    break;
  case 2:
    second();
    break;
  case 1:                // NOK
    first();
    break;
  default:
}

switch (a) {
  case 1:
    first();
    // fall through
  case 2:
    second();
    break;
  case 1:                // OK
    first();
    break;
  default:
}
