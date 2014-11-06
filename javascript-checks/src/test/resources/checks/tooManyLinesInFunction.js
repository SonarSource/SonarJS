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

/**
 * Immediately Invoked Function Expression
 */
(function () {         // OK - IFFE

    function f() {     // NOK
        // comment
        var a = 1;
        return 1;
    }

    function g() {
    }

})();

/**
 * Immediately Invoked Function Expression
 */
var a = function () {   // OK - IFFE
    // comment
    var a = 1;
    return a;
}();


var f = function () {  // OK
  return 1;
}

function f() {         // OK
  return 1;
}
