function foo() {
  unknown in
//S       ^^ 1
             1; // Noncompliant [[id=1]] {{TypeError can be thrown as this operand might have primitive type.}}
//           ^

  unknown in "foo"; // Noncompliant
  unknown in true;  // Noncompliant
  unknown in null;  // Noncompliant
  unknown in undefined;  // Noncompliant
  unknown in new Number(1); // OK

  if (condition()) {
    var x = 42;
  }

  unknown in 1+2; // Noncompliant

  foo(x);
}
