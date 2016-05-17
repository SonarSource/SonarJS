function main() {

  var x = foo();

  if (x == null) {
    x.foo();
  }

  foo(x); // PS x=NOT_NULLY
}
