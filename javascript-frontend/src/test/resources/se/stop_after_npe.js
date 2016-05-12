function main() {

  var x = foo();

  if (x == null) {
    x.foo();
  }

  foo(x); // x=NOT_NULL

  something();
}
