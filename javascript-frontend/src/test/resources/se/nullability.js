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

  if (x === null) {
    foo(); // PS x=NULL
  } else {
    foo(); // PS x=NOT_NULL
  }

  if (x === undefined) {
    foo(); // PS x=UNDEFINED
  } else {
    foo(); // PS x=NOT_UNDEFINED
  }
}
