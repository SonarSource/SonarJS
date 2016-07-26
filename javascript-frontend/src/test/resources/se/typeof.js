function main() {

  var x = foo();

  if (typeof x == 'undefined') {
    foo(); // PS x=UNDEFINED
  } else {
    foo(); // PS x=NOT_UNDEFINED
  }
  makeLive(x);

  x = foo();
  if ('undefined' != typeof x) {
    foo(); // PS x=NOT_UNDEFINED
  } else {
    foo(); // PS x=UNDEFINED
  }
  makeLive(x);

  x = foo();
  if (typeof x === "undefined") {
    foo(); // PS x=UNDEFINED
  } else {
    foo(); // PS x=NOT_UNDEFINED
  }
  makeLive(x);

  x = foo();
  if (typeof x === "function") {
    foo(); // PS x=FUNCTION
  } else {
    foo(); // PS x=NOT_FUNCTION
  }
  makeLive(x);

  x = foo();
  if (typeof x === "object") {
    foo(); // PS x=NULL_OR_NON_FUNCTION_OBJECT
  } else {
    foo(); // PS x=NOT_NULL_OR_NON_FUNCTION_OBJECT
  }
  makeLive(x);

  x = foo();
  if (typeof x === "number") {
    foo(); // PS x=NUMBER
  } else {
    foo(); // PS x=NOT_NUMBER
  }
  makeLive(x);

  x = foo();
  if (typeof x === "string") {
    foo(); // PS x=STRING
  } else {
    foo(); // PS x=NOT_STRING
  }
  makeLive(x);

  x = foo();
  if (typeof x === "boolean") {
    foo(); // PS x=BOOLEAN
  } else {
    foo(); // PS x=NOT_BOOLEAN
  }
  makeLive(x);

  x = foo();
  if (typeof x === "not_existing_type") {
    x = null;
  }
  foo(); // PS x=UNKNOWN
  makeLive(x);

  x = null;
  if (typeof x == 'number') {
    var y = 42;
  } else {
    foo(); // PS x=NULL
  }
  foo(); // PS y=UNDEFINED & x=NULL
  makeLive(x, y);

  x = null;
  if (typeof x !== 'object') {
    var y = 42;
  } else {
    foo(); // PS x=NULL
  }
  foo(); // PS y=UNDEFINED & x=NULL

  makeLive(x, y);
}
