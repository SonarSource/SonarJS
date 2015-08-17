if (x) {}

function ok1() {}

function ok2() { // +1
  if (x) {      // +1
  }
  return 1; // +0
}

function ko1() { // +1
  if (x) {       // +1
    return 0;    // +1
  }
  return 1;      // +0
}

function ko2() { // +1
  if (x) {       // +1
  } else if (y) { // +1
  }
}

function * ko3() { // +1
  if (x) {         // +1
    return 0;      // +1
  }
  return 1;        // +0
}

function nesting() {   // +1 nesting
  function nested() {  // +1 nesting, nested
    if (x) {           // +1 nesting, nested
    }
    return 1;          // +0
  }
}

class c {
  ko() {        // +1
    if (x) {    // +1
      return 0; // +1
    }
    return 1;   // +0
  }
  ok1() {       // +1
    if (x) {    // +1
    }
    return 1;   // +0
  }
  ko2() {           // +1
    if (x) {        // +1
    } else if (y) { // +1
    }
  }
}

function ok() {  // +1
  return { 
    get x() {    // +0
      if (x) {}  // +1
      return 0;  // +1
    }
  };
}

function ko() {  // +1
  return {
    get x() {    // +0
      if (x) {   // +1
        return 0;// +1
      }
      return 1;  // +0
    }
  };
}

function ko() {  // +1
  return {
    get x() {    // +0
      if (x) {     // +1
        return 0;  // +1
      } else if (y) { // +1
      }
    }
  };
}


(function () {         // OK - Immediately Invoked Function Expression; complexity = 4

    function f() {     // NOK; complexity = 3
        var a = true && false && true;
    }

    function g() {     // OK; complexity = 1
    }

})();


var a = function () {   // OK - Immediately Invoked Function Expression; complexity = 3
    var a = true && false && true;
}();

new function(){  // NOK
    var a = true && false && true;
};

new (function(){  // OK
    var a = true && false && true;
})();


define([], function(){  // AMD PATTERN - OK
    var a = true && false && true;
});

define([], "module name", function(){  // AMD PATTERN - OK
    var a = true && false && true;
});