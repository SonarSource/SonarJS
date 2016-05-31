  switch (a) {         // Noncompliant {{Replace this "switch" statement with "if" statements to increase readability.}}
//^^^^^^
  case 1:
    doSomething();
    break;
  default:
    doSomething();
}

switch (a) {         // Noncompliant

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
