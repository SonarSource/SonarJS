function main() {
  var x = null;
  var y = foo();

  if (y == null) {
    x = 42;
  }

  doSomething();  // PS x=TRUTHY_NUMBER & y=NULLY || x=NULL & y=NOT_NULLY


  makeLive(x, y);
  
  x = foo();
  y = foo();
  var z = x && y;
  if (z) {
    dummyStatement(); // PS x=TRUTHY & y=TRUTHY
  }

  makeLive(x, y);

}
