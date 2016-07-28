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

  function ko2() { // Noncompliant [[effortToFix=1;secondary=+0,+2,+3]] // +1
//^^^^^^^^^^^^^^
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

function * ko4() { // Noncompliant // +1
  if (x) {         // +1
    if (y) {}      // +1
  }
  return 1;        // +0
}

function ok() {          // OK            +1 for ok
  a = true && false;     //               +1 for ok
  b = function foo() {   // OK            +1 for foo, +0 for ok
    if (x) {             //               +1 for foo
    } 
    return 1;            //               +0 for foo
  }
}

function ok() {          // OK            +1 for ok
  a = true && false;     //               +1 for ok
  b = arr.map(s => s.length);   // OK     +0 for ok
}

function ok() {          // OK            +1 for ok
  a = true && false;     //               +1 for ok
  b = () => 10;          // OK            +0 for ok
}

function nesting() {     // OK            +1 for nesting
  function nested() {    // OK            +1 for nested
    if (x) {             //               +1 for nested
    } 
    return 1;            //               +0 for nested
  }
}

function nesting() {     // OK            +1 for nesting
  function nested() {    // Noncompliant  +1 for nested
    if (x) {             //               +1 for nested      
    } else if (y) {      //               +1 for nested
    }
  }
}

function nesting() {     // Noncompliant  +1 for nesting
  if (x) {               //               +1 for nesting
  }
  
  function nested() {    // Noncompliant  +1 for nested
    if (x) {             //               +1 for nested
    } else if (y) {      //               +1 for nested
    }
  }
  
  if (x) {               //               +1 for nesting
  }
}

function nesting1() {    // OK            +1 for nesting1
  function nesting2() {  // OK            +1 for nesting2
    function nested() {  // Noncompliant  +1 for nested
//  ^^^^^^^^^^^^^^^^^
      if (x) {           //               +1 for nested
        return 0;        //               +1 for nested
      }
      return 1;          //               +0 for nested
    }
  }
}

function nesting1() {    // OK            +1 for nesting1
  function nesting2() {  // Noncompliant  +1 for nesting2
    a = true && false;   //               +1 for nesting2
    b = true && false;   //               +1 for nesting2
    function nested() {  // Noncompliant  +1 for nested
      if (x) {           //               +1 for nested
        return 0;        //               +1 for nested
      }
      return 1;          //               +0 for nested
    }
  }
}

class C {
  ko() {        // Noncompliant // +1
//^^^^
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

class D {
  nesting() {             // OK            +1 for nesting
    function nested() {   // Noncompliant  +1 for nested
      while (x < y) {     //               +1 for nested
        return 0;         //               +1 for nested
      }
    }
  }
}

function ok() {           // OK           +1 for ok
  return {                //              +0 for ok
    get x() {             // OK           +1 for x
      if (c) {}           //              +1 for x
      return 0;           //              +0 for x
    }
  };
}

function ok() {           // OK           +1 for ok
  a = true || false;      //              +1 for ok
  
  function* generator() { //              +1 for generator
  }
}

function ko() {          // OK           +1 for ko
  return {               //              +0 for ko
    get x() {            // Noncompliant [[effortToFix=3]] {{Function has a complexity of 5 which is greater than 2 authorized.}}  +1 for x
//  ^^^^^^^
      try {}
      catch(err) {}      //              +1 for x
      if (c) {}          //              +1 for x
      else if (d) {}     //              +1 for x
      if (c) {}          //              +1 for x
      return 0;          //              +0 for x
    }
  };
}

function ko() {          // Noncompliant +1 for ko
  if (a) {}              //              +1 for ko
  throw "error";         //              +1 for ko
  return {               //              +0 for ko
    get x() {            // Noncompliant +1 for x  
      for (i=0; i<2; i++){};         //              +1 for x
      if (b) {}          //              +1 for x
      if (c) {}          //              +1 for x
      return 0;          //              +0 for x
    }
  };
}

(function () {         // OK - Immediately Invoked Function Expression; complexity = 4

    function f() {     //  Noncompliant {{Function has a complexity of 3 which is greater than 2 authorized.}}
        var a = true && false && true;
    }

    function g() {     // OK - complexity = 1
    }

    if (x) {}
    if (x) {}
    if (x) {}
})();

(function(x) {         // OK - Immediately Invoked Function Expression; complexity = 4
  if (x) {}
  if (x) {}
  if (x) {}
})(34);

var a = function () {   // OK - Immediately Invoked Function Expression; complexity = 3
    var a = true && false && true;
}();

new function(){  //  Noncompliant
//  ^^^^^^^^^^
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


// ANGULAR JS Exceptions

var moduleX = angular.module("moduleX");

moduleX
  .controller("Name", function() {   // OK
    var a = true && false && true;
  })
  .service("Name", ['$scope', function($scope) {   // OK
    var a = true && false && true;
  }]);


moduleX.config(function() {   // OK
    var a = true && false && true;
});
