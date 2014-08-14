function f() {         // NOK
  function f() {       // NOK
    // comment
    return 1;
  }
}

var f = function () {  // NOK
  // comment
  return 1;
}

function f() {         // NOK
  // comment
  return 1;
  function f() {       // OK
  }
}

function * f() {       // NOK
  // comment
  return 1;
}

var f = function () {  // OK
  return 1;
}

function f() {         // OK
  return 1;
}
