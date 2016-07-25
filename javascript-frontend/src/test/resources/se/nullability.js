function main() {

  var x; // PS x=UNDEFINED
  x = null; // PS x=NULL
  x = undefined; // PS x=UNDEFINED

  x = foo(); // PS x=UNKNOWN

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
  foo(); // PS y=TRUTHY_NUMBER
  makeLive(y);
}
