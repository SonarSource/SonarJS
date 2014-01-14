var fn = function () {
}

(function () {            // NOK

})();

doSomething()[a]
    (b);                  // NOK

var fn = function () {

}(function () {           // OK

   })();                  // OK

(function() {

})(function() {           // OK
   })(                    // OK
        param
    );
