function main() {
  var x = foo1();
  if (!x) {
    x = 42;
  }
  bar(); // PS x=TRUTHY
  makeLive(x);

  x = foo2();
  if (!(x)) {
    x = 42;
  }
  bar(); // PS x=TRUTHY
  makeLive(x);

  var notExecuted;
  x = 42;
  if (x != null) {
  } else {
    notExecuted = 42;
  }
  bar(); // PS notExecuted=UNDEFINED
  makeLive(notExecuted);

  if (x) {
  } else {
    notExecuted = 42;
  }
  bar(); // PS notExecuted=UNDEFINED
  makeLive(notExecuted);

  if (!x) {
    notExecuted = 42;
  } else {
  }
  bar(); // PS notExecuted=UNDEFINED
  makeLive(notExecuted);

  x = foo3();
  if (x == null) {
    foo(); // PS x=NULLY
  } else {
    bar(); // PS x=NOT_NULLY
  }
  makeLive(x);

  x = foo4();
  if (undefined != x) {
    foo(); // PS x=NOT_NULLY
  } else {
    bar(); // PS x=NULLY
  }
  makeLive(x);

  x = 42;

  if (true) {
  } else {
    x = null;
  }

  dummyStatement(); // PS x=TRUTHY
  makeLive(x);

  if (false) {
  } else {
    x = null;
  }

  dummyStatement(); // PS x=NULL
  makeLive(x);

  while(true) {
    break;
  }

  var y1 = null, y2 = 42, z = 42;

  if (y1 != null) {
    z = null;
  }

  dummyStatement(); // PS z=TRUTHY
  makeLive(z);

  if (y2 == null) {
    z = null;
  }

  makeLive(z); // PS z=TRUTHY

  x = foo(), y1 = bar();
  z = x === null && y1;
  if (z) {
    dummyStatement(); // PS x=NULL & y1=TRUTHY
  }

  makeLive(y1, x);
}
