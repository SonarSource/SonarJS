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

a = cond ? first() : second();  // OK
a = cond ? first() : first();  // NOK
a = cond ? "literal" : "other lireral";  // OK
a = cond ? first() + 1 : first() + 2;  // OK
a = cond ? first() + 1 : first() + 1;  // NOK