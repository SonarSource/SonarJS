function f1(p1, p2, p3) {}

function f2(p1, p2, p3) {}
function f2() {}

function withInitializer(p1="", p2="") {}
function arrayBindingPattern([], p2) {}

class A {
  method1(p1, p2) {}
}

function main() {
  f1(p1, p2, p3);
  f1(p2, p1, p3); // Noncompliant [[sc=5;ec=17;secondary=1]] {{Arguments to "f1" have the same names but not the same order as the function parameters.}}
  f1(p1, p3, p2); // Noncompliant
  f1(p1, p3, P2); // Noncompliant
  f1(p1, p2, xxx);
  f1(p1, "p2", "x");
  unknown(p1, p3, p2);
  f2(p1, p3, p2);
  (function(p1, p2) {})(p1, p2);
  (function(p1, p2) {})(p2, p1); // Noncompliant {{Arguments to this call have the same names but not the same order as the function parameters.}}
  var a1 = new A();
  a1.method1(p1, p2);
  a1.method1(p2, p1); // Noncompliant
  withInitializer(p1, p2);
  withInitializer(p2, p1); // Noncompliant
  arrayBindingPattern(p2, p1);
}
