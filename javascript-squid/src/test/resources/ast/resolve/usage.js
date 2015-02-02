var a = 1;
b = 1; // implicit declaration

f();                         // f
new f;                       // f

doSomething(a + b);          // a, b

function f(p1, p2) {
  return a + p1.length;       // a, p1

  var b = function g() {
    if (false) return g();   // g - function expression
  }

  return new b || b();       // b, b
}

try {

} catch (e) {
  throw e;                   // e
}

