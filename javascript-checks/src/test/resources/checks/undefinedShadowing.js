function f() {
  var undefined = 1;  // NOK
  var undefined;      // NOK
  var a = 1;          // OK
}

var undefined = 1;    // OK
var undefined;        // OK

