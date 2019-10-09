function commaOperator() {
  switch (a) {
    case 0:         // OK
    case 1:         // OK
      foo1();
      break;
    case 2,3:       // Noncompliant
      foo2();
      break;
    case "a","b","c","d": // Noncompliant
      foo3();
      break;
    case bar(), baz() : // Noncompliant
      foo();
      break;
    default:
      foo4();
  }
}

function orOperator() {
  switch (a) {
    case 0:         // OK
    case 1 && 2:    // OK
      foo1();
      break;
    case 2 || 3:       // Noncompliant
      foo2();
      break;
    case "a" || "b" || "c" || "d": // Noncompliant
      foo3();
      break;
    case bar() || baz() : // Noncompliant
      foo();
      break;
    default:
      foo4();
  }
}
