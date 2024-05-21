class A {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class B {
  constructor(parent = null) {
    this.parent = parent;
  }
}

function constructor_call_with_literals() {
  return new A(42, 666);
}

function constructor_call_passing_parameters(x, y) {
  return new A(x, y);
}

function constructor_call_missing_one_argument(x) {
  return new A(x);
}

function constructor_call_without_arguments() {
  return new A();
}

function constructor_call_with_default_values() {
  let b = new B();
}

function unknown_constructor_call() {
  let c = new C();
}
