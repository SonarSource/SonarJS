let v1 = 1;  // Noncompliant {{Make "v1" "const".}}
foo(v1);

var v2 = 1; // OK
foo(v2);

const v3 = 1; // OK
foo(v3);

let v4 = 1;  // OK, unused

let v5;   // OK, not initialization during declaration
v5 = 10;
foo(v5);
