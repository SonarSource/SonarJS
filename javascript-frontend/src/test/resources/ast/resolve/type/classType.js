class A {
}

var B = class B1 {
  foo() {
    this.bar(1);
  }

  bar(p) {
    this.foobar(p);
    return this;
  }
}

var x = new B1(); // "ReferenceError: Can't find variable: B1", but we "hoist" "B1" to be able to resolve it's usages in functions declared above declaration

var C = class {
}

function foo() {
  class D extends A {
  }
  var x = new D();
}

var z = new B();
