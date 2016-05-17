function main() {
  var x = foo();
  var y = bar();

  var z = (x == null || y == null)
    ? 1
    : x.foo;  // PS x=NOT_NULLY
}
