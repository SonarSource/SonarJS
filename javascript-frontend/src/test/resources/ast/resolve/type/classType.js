class A {
}

var B = class B1 {
  get propWithGetter() {}

  foo() {
    this.bar(1);
  }

  bar(p) {
    this.foobar(p);
    return this;
  }
}

var x = new B1(); // ReferenceError: Can't find variable: B1

var C = class {
}

function foo() {
  class D extends A {
  }
  var x = new D();
}

var z = new B();
