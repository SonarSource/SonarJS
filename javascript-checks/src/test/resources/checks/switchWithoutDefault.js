switch (param) {
  case 0:
    break;
  default: // OK
    break;
}

  switch (param) { // Noncompliant {{Add a "default" clause to this "switch" statement.}}
//^^^^^^
  case 1:
    break;
}

switch (param) {
  case 0:
    break;
  default: // Noncompliant {{Move this "default" clause to the end of this "switch" statement.}}
//^^^^^^^
    break;
  case 1:
    break;
}
