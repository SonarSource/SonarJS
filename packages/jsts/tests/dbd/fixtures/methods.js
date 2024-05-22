class A {
  constructor() {
  }

  foo() {
    return 42;
  }

  static static_method(x, y) {
  }

  property_method(x, y) {
  }

  static class_method() {
  }

  some_method() {
  }
}

function bound_methods() {
  let a = new A();
  other(a.foo);
  other(A.static_method);
  other(a.prop);
}
