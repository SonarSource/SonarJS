function fun(a) { // NOK
}

function fun(a) { // OK
  a = 1;
}

function fun(a) { // OK
  function nested() {
    a = 1;
  }
}
