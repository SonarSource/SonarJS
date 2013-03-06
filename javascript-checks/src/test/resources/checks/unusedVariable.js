var a = 0; // OK

function fun() {
  var a = 0; // NOK
  var b = 1; // OK
  return b;
}

function fun() {
  var a = 0; // OK
  function nested() {
    a =  1;
  }
}

function fun() {
  var a = 0; // NOK
  function nested(a) {
    a =  1;
  }
}
