function sayHello() {
  var a1 = new Array(x1, x2, x3); // NOK
  var a2 = new Array(x1, x2, x3); // NOK

  var o = new Object(); // NOK

  var a1 = [x1, x2, x3]; // OK
  var a2 = []; // OK

  var o = {}; // OK
}
