function foo() {
  switch (a) {
    case 0:         // OK
    case 1:         // OK
      foo1();
      break;
    case 2,3:       // Noncompliant {{Explicitly specify 2 separate cases that fall through; currently this case clause only works for "3".}}
//       ^^^
      foo2();
      break;
    case "a","b","c","d": // Noncompliant {{Explicitly specify 4 separate cases that fall through; currently this case clause only works for ""d"".}}
//       ^^^^^^^^^^^^^^^
      foo3();
      break;
    case bar(), baz() : // Noncompliant {{Explicitly specify 2 separate cases that fall through; currently this case clause only works for "baz()".}}
//       ^^^^^^^^^^^^
      foo();
      break;
    default:
      foo4();
  }
}
