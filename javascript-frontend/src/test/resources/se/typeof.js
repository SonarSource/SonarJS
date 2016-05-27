function main() {

  var x = foo();

  if (typeof x == 'undefined') {
    foo(); // PS x=UNDEFINED
  } else {
    foo(); // PS x=NOT_UNDEFINED
  }

  x = foo();
  if ('undefined' != typeof x) {
    foo(); // PS x=NOT_UNDEFINED
  } else {
    foo(); // PS x=UNDEFINED
  }

  x = foo();
  if (typeof x === "undefined") {
    foo(); // PS x=UNDEFINED
  } else {
    foo(); // PS x=NOT_UNDEFINED
  }

  x = foo();
  if (typeof x === "function") {
    foo(); // PS x=TRUTHY
  } else {
    foo(); // PS x=UNKNOWN
  }

  x = foo();
  if (typeof x === "object") {
    foo(); // PS x=TRUTHY_OR_NULL
  } else {
    foo(); // PS x=NOT_NULL
  }

  x = foo();
  if (typeof x === "number") {
    foo(); // PS x=NOT_NULLY
  } else {
    foo(); // PS x=UNKNOWN
  }

  x = foo();
  if (typeof x === "string") {
    foo(); // PS x=NOT_NULLY
  } else {
    foo(); // PS x=UNKNOWN
  }

  x = foo();
  if (typeof x === "boolean") {
    foo(); // PS x=NOT_NULLY
  } else {
    foo(); // PS x=UNKNOWN
  }

  x = foo();
  if (typeof x === "not_existing_type") {
    x = null;
  }
  foo(); // PS x=UNKNOWN

  x = null;
  if (typeof x == 'number') {
    var y = 42;
  } else {
    foo(); // PS x=NULL
  }
  foo(); // PS y=UNDEFINED & x=NULL

  x = null;
  if (typeof x !== 'object') {
    var y = 42;
  } else {
    foo(); // PS x=NULL
  }
  foo(); // PS y=UNDEFINED & x=NULL

  dummyStatement();
}
