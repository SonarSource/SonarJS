class A {
  foo() {
    this.bar();
  }

  bar() {
    let a = new A();
    a.foo();
  }
}
