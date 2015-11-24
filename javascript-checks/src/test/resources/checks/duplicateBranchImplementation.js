if (a) {
  first();
} else {                 // Noncompliant {{Either merge this branch with the identical one on line "1" or change one of the implementations.}}
  first();
}

if (a) {
  first();
} else if (a) {          // Noncompliant [[sc=15;el=+2;ec=2;secondary=-2]]
  first();
}

if (a) {
  first();
} else if (a) {
  second();
} else if (a) {          // Noncompliant
  first();
}

if (a) {
  first();
} else if (a) {          // Noncompliant
  first();
} else if (a) {
  second();
}

switch (a) {
  case 1:
    first();
    break;
  default:               // Noncompliant {{Either merge this case with the identical one on line "30" or change one of the implementations.}}
    first();
}

switch (a) {
  case 1:
    first();
    break;
  case 2:                // Noncompliant [[sc=3;el=+2;ec=11;secondary=-3]]
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
  default:               // Noncompliant
    first();
}

switch (a) {
  case 1:
    first();
    break;
  case 2:                // Noncompliant
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
  case 1:                // Noncompliant
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
