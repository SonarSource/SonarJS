function sayHello() {
  if (x) {
    function foo() {} // NOK
  }

  if (x) {
    let foo;
    foo = function() {} // OK
  }

  if (x) {
    // empty block
  }
}
