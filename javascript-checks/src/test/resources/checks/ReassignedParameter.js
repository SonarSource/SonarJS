// ---------- FUNCTION PARAMETER ---------

function foo(p1, p2, p3, ... p4) {
  p1 = 42; // Noncompliant {{Introduce a new variable instead of reusing the parameter "p1".}}

  foo(p3++); // Noncompliant
//    ^^

  foo(p3++); // Noncompliant
//    ^^

  foo(p2);

  var x = p2 + 1;

  var p4 = 42; // Noncompliant
}

function bindingElements({a: p1, p2}, [p3, p4], p5 = 42) {
  p1 = 42; // Noncompliant
  p2 = 42; // Noncompliant
  p3 = 42; // Noncompliant
  p4 = 42; // Noncompliant
  p5 = 42; // Noncompliant
}


var arrow_function1 = (p1, p2) => {
  p2 = 42; // Noncompliant
  p1.prop1 = 42; // OK
  foo(p1, p2);
}

var arrow_function2 = p1 => {
  p1 = 42; // Noncompliant
  foo(p1);
}

(function(p) {
  p = 42; // Noncompliant
})(1);

// Ok, function call
var p1;
p1 = 42;
foo(p1, p2);




// ---------- EXCEPTION in CATCH clause ---------

try {
  foo();
} catch (e) {
  e = foo(); // Noncompliant {{Introduce a new variable instead of reusing the caught exception "e".}}
}

try {
  foo();
} catch ([e1, e2]) {
  e1 = foo(); // Noncompliant
  foo(e2);
}



// ---------- VARIABLE in FOR-IN/FOR-OF loops ---------

for (var x in obj) {
  x = foo(); // Noncompliant {{Introduce a new variable instead of reusing the foreach variable "x".}}
}

for (var [a, b] in obj) {
  a = foo(); // Noncompliant
}

for (let {prop1, prop2} in obj) {
  prop1 = foo(); // Noncompliant
}

for (let x of obj) {
  x = foo(); // Noncompliant
}

var y = 1;
y = 42;
for (y of obj) {
  y = foo(); // Noncompliant
}

var z;
for (z in obj) {
  z = foo(); // Noncompliant
}

for ([a, [b]] in obj) {
  a = foo(); // Noncompliant
  b = foo(); // Noncompliant
}

for ({a, b} in obj) {
  a = foo(); // Noncompliant
  b = foo(); // Noncompliant
}

// illegal code
for (a[1] in obj) {
  a = foo(); // Noncompliant, FP but only because of illegal code
}
