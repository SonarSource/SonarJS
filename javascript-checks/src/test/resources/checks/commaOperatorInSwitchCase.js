function foo() {
  switch (a) {
    case 1:         // OK
      foo();
      break;
    case 1:         // OK
      foo();
      break;
    case 2,3:       // Noncompliant {{Explicitly specify 2 separate cases that fall through; currently this case clause only works for "3".}}
//       ^^^
      foo();
      break;
    case "a","b","c","d": // Noncompliant {{Explicitly specify 4 separate cases that fall through; currently this case clause only works for ""d"".}}
//       ^^^^^^^^^^^^^^^
      foo();
      break;
    default:
      foo();
  }
}
