function main() {
  var x = null;
  var y = foo();

  if (y == null) {
    x = 42;
  }

  doSomething();  // PS x=TRUTHY & y=NULLY || x=NULL & y=NOT_NULLY

  dummyStatement();
  
  x = foo();
  y = foo();
  var z = x && y;
  if (z) {
    dummyStatement(); // PS x=TRUTHY
  }
}
