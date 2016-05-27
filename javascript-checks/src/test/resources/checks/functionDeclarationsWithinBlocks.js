function sayHello() {
  if (x) {
    function foo() {}        // Noncompliant {{Do not use function declarations within blocks.}}
//  ^^^^^^^^
  }

  if (x) {
    let foo;
    foo = function() {}      // OK
  }

  if (x) {
    // empty block
  }

  p => {
    var foo = function() {}; // OK
  };
}
