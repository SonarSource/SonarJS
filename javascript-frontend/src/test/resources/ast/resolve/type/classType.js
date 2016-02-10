class A {
}

var B = class B1 {
}

var x = new B1(); // ReferenceError: Can't find variable: B1

var C = class {
}

function foo() {
  class D extends A {
  }
  var x = new D();
}
