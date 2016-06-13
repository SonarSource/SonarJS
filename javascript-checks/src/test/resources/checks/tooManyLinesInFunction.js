// max = 3

function f() {         // Noncompliant {{This function has 7 lines, which is greater than the 3 lines authorized. Split it into smaller functions.}}
  function f() {       // Noncompliant {{This function has 5 lines, which is greater than the 3 lines authorized. Split it into smaller functions.}}
//^^^^^^^^^^^^
    // comment
    return 1;
  }
}

var f = function () {  // Noncompliant
  // comment
  return 1;
}

function f() {         // Noncompliant
  // comment
  return 1;
  function f() {       // OK
  }
}

function * f() {       // Noncompliant
  // comment
  return 1;
}

/**
 * Immediately Invoked Function Expression
 */
(function () {         // OK - IIFE

    function f() {     // Noncompliant
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
var a = function () {   // OK - IIFE
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

class A {
  myMethod() {
    return 42;
  }
  *myGenerator() {
    yield 42;
  }
}

new (function(){  // OK
    // comment
    var a = 1;
})();

new function(){  // Noncompliant
    // comment
    var a = 1;
};

define([], function(){  // AMD PATTERN - OK
    // comment
    return 1;
});

define([], "module name", function(){  // AMD PATTERN - OK
    // comment
    return 1;
});



// ANGULAR JS Exceptions

var moduleX = angular.module("moduleX");

moduleX
  .controller("Name", function() {   // OK


  })
  .service("Name", ['$scope', function($scope) {   // OK


  }]);


moduleX.config(function() {   // OK


});

moduleX.config(['a', 'b', function(a, b) {   // OK


}]);

moduleX.directive("name", directiveFactory);

function directiveFactory(){       // OK


}

moduleX.constant("name", {});

function foo() {  // Noncompliant


}

moduleX.value("name", []);  // OK

var x = () => { // Noncompliant



};

var y = () => foo( // Noncompliant




);

var z = () => 1; // OK
