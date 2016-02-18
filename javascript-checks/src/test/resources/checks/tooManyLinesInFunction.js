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
(function () {         // OK - IIFE

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

new function(){  // NOK
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

function foo() {  // NOK


}
