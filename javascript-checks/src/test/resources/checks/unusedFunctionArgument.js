function fun(a, b) { // NOK
  b = 1;
}

function fun(a, b, c) { // NOK
  a = 1;
  c = 1;
}

function fun(a, b) { // OK
  a = 1;
}

function fun(a) { // OK
}


function fun(a) { // OK
  function nested() {
    a = 1;
  }
}
