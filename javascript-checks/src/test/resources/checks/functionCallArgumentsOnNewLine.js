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

`characters` ()
()                         // Noncompliant {{Make those call arguments start on line 25}}

a()()();
