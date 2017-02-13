function main() {

  var x; // PS x=UNDEFINED
  x = null; // PS x=NULL
  x = undefined; // PS x=UNDEFINED

  x = foo(); // PS x=ANY_VALUE

  if (x == null) {
    foo(); // PS x=NULLY
  } else {
    foo(); // PS x=NOT_NULLY
  }

  if (x != null) {
    foo(); // PS x=NOT_NULLY
  } else {
    foo(); // PS x=NULLY
  }
  makeLive(x);

  x = foo();
  if (x !== null) {
    foo(); // PS x=NOT_NULL
  } else {
    foo(); // PS x=NULL
  }
  makeLive(x);

  x = foo();
  if (x === undefined) {
    foo(); // PS x=UNDEFINED
  } else {
    foo(); // PS x=NOT_UNDEFINED
  }
  makeLive(x);

  x = null;
  var y = 42;
  if (x === null) {
    y = null;  // always executed
  }
  foo(); // PS y=NULL
  makeLive(y);

  x = 42;
  y = 42;
  if (x === null) {
    y = null;  // never executed
  }
  foo(); // PS y=POS_NUMBER
  makeLive(y);

  x = foo();
  if (x == null) {
    var g = true;
    if (x !== undefined) {
      g = false;
    }
    foo(); // PS x=NULL & g=FALSE || x=UNDEFINED & g=TRUE
    makeLive(x, g);
  }
}
