function sayHello() {
  return;
  var a; // Noncompliant [[secondary=-1]] {{Remove this code after the "return" statement.}}

  if (true) {
    return;
    var b; // Noncompliant {{Remove this code after the "return" statement.}}
  } else {
    var c;
  }

  while (true) {
    break;
    var d; // Noncompliant {{Remove this code after the "break" statement.}}

    continue;
    var e; // Noncompliant {{Remove this code after the "continue" statement.}}

    if (true) {
      break;
      /** OK and is not affected by comments */
    }

    if (true) {
      continue; // OK
    }

    if (true)
      break; // OK

    if (true)
      continue; // OK
  }

  switch (a) {
  case 1: {
    break;
    var e; // Noncompliant {{Remove this code after the "break" statement.}}
  }
  case 2:
    break; // OK
  case 3:
    break; // OK
  default:
    var g;
  }
  
  switch (a) {
  default:
    foo();
    break;
  case 1:  // OK
    bar();
  }
  
}

function tryCatchFinally() {

  try {
    var h;
    throw ("MyException");
    var i; // Noncompliant {{Remove this code after the "throw" statement.}}
  } catch (e) {
    var j;
    throw ("MyException");
  } finally {
    var k;
  }

  try {
    return foo();
  } catch (e) {
    bar(); // OK
  }

  try {
    throw ("MyException");
  } catch (e) {
    var m; // OK
  }
  
  try {
    doSomething();
  } catch (e) {
    return;
  }
  doSomethingElse(); // OK
  
}

function f1() {

  if (a) {
    if (true)
      return; // OK
    else if (false)
      return; // OK
    else {
      return;
    }
    var n; // Noncompliant [[secondary=-6,-4,-2]] {{Remove this unreachable code.}}
  }

  return;

  function f(){ // OK
  }

}

function infiniteLoop() {
  for(;;) {
  }
  unreachable(); // Noncompliant
}

function a() {
  return;
  function* g() {} // OK
}

function b() {
  return;
  class C {} // OK
}
