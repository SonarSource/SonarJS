function f() {

  if (something) {   // NOK
    return true;
  } else {
    return false;
  }

  if (something) {   // NOK
    return false;
  } else {
    return true;
  }

  if (something)     // NOK
    return true;
  else
    return false;

  if (something)     // OK
    return true;
  else if (something)
    return false;
  else
    return true;

  if (something) {   // OK
    return foo;
  } else {
    return false;
  }

  if (something) {   // OK
    return true;
  } else {
    return foo;
  }

  if (something) {   // OK
    doSomething();
  } else {
    return true;
  }

  if (something) {   // OK
    doSomething();
    return true;
  } else {
    return false;
  }

  if (something) {   // OK
    return;
  } else {
    return true;
  }

  if (something) {   // OK
    return true;
  }

  if (something) {   // OK
    return foo(true);
  } else {
    return foo(false);
  }

  if (something) {   // OK
    var foo;
  } else {
    return false;
  }

  if (something) { // OK
    function f() {}
    return false;
  } else {
    return true;
  }
}
