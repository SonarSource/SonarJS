function f() {
  var undefined = 1;  // NOK
  var undefined;      // NOK
  let undefined;      // NOK
  var a = 1;          // OK
}

var undefined = 1;    // OK
var undefined;        // OK

undefined = 1;        // OK

function b() {
  const undefined;      // NOK
}
