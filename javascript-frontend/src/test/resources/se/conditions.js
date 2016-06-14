function main() {
  var x = foo1();
  if (!x) {
    x = 42;
  }
  bar(); // PS x=TRUTHY

  x = foo2();
  if (!(x)) {
    x = 42;
  }
  bar(); // PS x=TRUTHY

  var notExecuted;
  x = 42;
  if (x != null) {
  } else {
    notExecuted = 42;
  }
  bar(); // PS notExecuted=UNDEFINED

  if (x) {
  } else {
    notExecuted = 42;
  }
  bar(); // PS notExecuted=UNDEFINED

  if (!x) {
    notExecuted = 42;
  } else {
  }
  bar(); // PS notExecuted=UNDEFINED

  x = foo3();
  if (x == null) {
    foo(); // PS x=NULLY
  } else {
    bar(); // PS x=NOT_NULLY
  }

  x = foo4();
  if (undefined != x) {
    foo(); // PS x=NOT_NULLY
  } else {
    bar(); // PS x=NULLY
  }

  x = 42;

  if (true) {
  } else {
    x = null;
  }

  dummyStatement(); // PS x=TRUTHY

  if (false) {
  } else {
    x = null;
  }

  dummyStatement(); // PS x=NULL

  while(true) {
    break;
  }

  var y1 = null, y2 = 42, z = 42;

  if (y1 != null) {
    z = null;
  }

  dummyStatement(); // PS z=TRUTHY

  if (y2 == null) {
    z = null;
  }

  dummyStatement(); // PS z=TRUTHY

  x = foo(), y1 = bar();
  z = x === null && y1;
  if (z) {
    dummyStatement(); // PS x=NULL & y1=TRUTHY
  }
}
