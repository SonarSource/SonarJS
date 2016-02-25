function f() {
  var undefined = 1;  // Noncompliant {{Rename this variable.}}
  var undefined;      // Noncompliant [[sc=7;ec=16]]
  let undefined;      // Noncompliant
  var a = 1;          // OK
}

var undefined = 1;    // OK
var undefined;        // OK

undefined = 1;        // OK

function b() {
  const undefined;      // Noncompliant
}
