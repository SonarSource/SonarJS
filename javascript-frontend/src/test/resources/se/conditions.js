function main() {
  var x = foo1();
  if (!x) {
    x = 42;
  }
  bar(); // x=TRUTHY

  x = foo2();
  if (!(x)) {
    x = 42;
  }
  bar(); // x=TRUTHY
  dummyStatement();
}
