if (x) {}

function ok1() {}

function ok2() { // +1
  if (x) {      // +1
  }
  return 1; // +0
}

function ko1() { // Noncompliant [[effortToFix=1]] {{Function has a complexity of 3 which is greater than 2 authorized.}} // +1
  if (x) {       // +1
    return 0;    // +1
  }
  return 1;      // +0
}

function ko2() { // Noncompliant [[effortToFix=1;sc=10;ec=13;secondary=18,19,20]] // +1
  if (x) {       // +1
  } else if (y) { // +1
  }
}

function * ko3() { // Noncompliant // +1
  if (x) {         // +1
    return 0;      // +1
  }
  return 1;        // +0
}

function nesting() {   // Noncompliant // +1 nesting
  function nested() {  // +1 nesting, nested
    if (x) {           // +1 nesting, nested
    }
    return 1;          // +0
  }
}

class c {
  ko() {        // Noncompliant [[sc=3;ec=5]] // +1
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
  ko2() {           // Noncompliant // +1
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

function ko() {  // Noncompliant // +1
  return {
    get x() {    // +0
      if (x) {   // +1
        return 0;// +1
      }
      return 1;  // +0
    }
  };
}

function ko() {  // Noncompliant [[effortToFix=2]] {{Function has a complexity of 4 which is greater than 2 authorized.}} // +1
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

    function f() {     //  Noncompliant {{Function has a complexity of 3 which is greater than 2 authorized.}}
        var a = true && false && true;
    }

    function g() {     // OK; complexity = 1
    }

})();


var a = function () {   // OK - Immediately Invoked Function Expression; complexity = 3
    var a = true && false && true;
}();

new function(){  //  Noncompliant
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