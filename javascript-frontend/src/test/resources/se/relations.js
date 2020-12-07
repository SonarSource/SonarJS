function main() {

  var a = foo();
  var b = bar();

  if (a > b) {
    let x = null;

    if (a < b) { // always false
      x = 0;
    }
    foo(x); // PS x=NULL
    
    if (a >= b) { // always true
      x = 0;
    }
    foo(x); // PS x=ZERO

    x = null
    if (a == b) {
      x = 0;
    }
    foo(x); // PS x=NULL
    
    x = null
    if (a === b) {
      x = 0;
    }
    foo(x); // PS x=NULL

  }
  
  if (a > unknown1) {
    let x2 = null;
    if (a > unknown2) {
      x2 = 0;
    }
    foo(x2); // PS x2=ZERO || x2=NULL
  }

  if (typeof a == "string" && typeof b == "number") {
    let x3 = null;

    if (a === b) {
      x3 = 0;
    }
    foo(x3); // PS x3=NULL

    if (a !== b) {
      x3 = 0;
    }
    foo(x3); // PS x3=ZERO
  }

  if (a == null) {
    if (a == b) {
      foo(b); // PS b=NULLY
    }
  }

///-------------- should not fail

  a = foo();
  b = bar();

  if (typeof a == "string" && typeof b == "number") {
    if (a == b) {
    }
    if (a === b) {
    }
  }

///-------------- should not fail

  a = foo();
  b = bar();

  if (a === b && condition()) {
    return
  }

  foo(a || 0);
  foo(b || 0);

  if (a === b) doSomething();


///-------------

  a = foo();
  b = bar();

  if (a === b) {
    if (a) {
      foo(b); // PS b=TRUTHY
    }
  }

///------------

  a = foo();

  if (a === "str") {
    foo(a); // PS a=TRUTHY_STRING
  }

///------------

  a = foo();

  if (a !== "str") {
  } else {
    foo(a); // PS a=TRUTHY_STRING
  }

///------------ should not fail
  a = foo();
  b = a === "str";

  if (!b && condition()) {
    dosmth();
  }

  if (typeof a === "object") {
    dosmth();
  }

  if (b && condition(a)) {
    dosmth();
  }
}
