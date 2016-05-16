function main() {
  var x = null;
  var y = foo();

  if (y == null) {
    x = 42;
  }

  doSomething();  // PS x=TRUTHY & y=NULL || x=NULL & y=NOT_NULL

  dummyStatement();
}
