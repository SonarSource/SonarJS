var a = 1;    // Noncompliant {{Replace "var" with "let" or "const"}}
var b;        // Noncompliant
var x1, x2;   // Noncompliant

x = 1;
let y = 1;
const z = 1;

function foo() {
  var x = 1;  // Noncompliant
}

for (var i = 1; i < 10; i++) {  // Noncompliant [[sc=6;ec=9;el=+0]]
}

for (let j = 1; j < 10; j++) {
}
