function sayHello() {
  var a1 = new Array(x1, x2, x3); // Noncompliant {{Use a literal instead of the Array constructor.}}
//         ^^^^^^^^^^^^^^^^^^^^^
  var a2 = new Array(x1, x2, x3); // Noncompliant

  var o = new Object(); // OK

  var a1 = [x1, x2, x3]; // OK
  var a2 = []; // OK

  var o = {}; // OK
}
