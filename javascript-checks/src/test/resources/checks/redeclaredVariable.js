function fun() {
  var a = 1;
  var a = 2; // NOK
}

function fun(a) {
  var a = 1; // NOK
}

function fun() {
  var i = 1;
  for (var i = 0; i < 10; i++) { // NOK
  }
}

function fun() {
  var b = 1;
  var a = 2,
      b = 2; // NOK
}
