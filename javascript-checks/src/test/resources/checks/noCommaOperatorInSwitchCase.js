function foo() {
  switch (a) {
    case 1:         // OK
      foo();
    case 2,3:       // Noncompliant {{Do not use the comma operator within a switch case}}
      foo();
    case 4,5,6,7:   // Noncompliant {{Do not use the comma operator within a switch case}}
      foo();
    default:
      foo();
  }
}

