var fn = function () {
}

(function () {            // Noncompliant {{Make those call arguments start on line 2}}

})();

doSomething()[a]
    (b);                  // Noncompliant {{Make those call arguments start on line 8}}
//  ^^^

var fn = function () {

}(function () {           // OK

   })();                  // OK

(function() {

})(function() {           // OK
   })(                    // OK
        param
    );

a()()();

// OK, if callee expression is call
foo(1)
  (2)
  (3);

// OK if there are more than one argument
var fn = function () {
}
(1, 2, 3);
