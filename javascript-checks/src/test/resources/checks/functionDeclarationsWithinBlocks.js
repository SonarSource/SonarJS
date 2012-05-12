function sayHello() {
  if (x) {
    function foo() {} // NOK
  }

  if (x) {
    var foo = function() {} // OK
  }
}
