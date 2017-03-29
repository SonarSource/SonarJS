function sayHello() {
  return;
  foo(); // Noncompliant [[sc=3;ec=8]] [[secondary=-1]] {{Remove this code after the "return" statement.}}

  if (true) {
    return;
    foo(); // Noncompliant {{Remove this code after the "return" statement.}}
  } else {
    foo();
  }

  while (true) {
    break;
    foo(); // Noncompliant {{Remove this code after the "break" statement.}}

    continue;
    foo(); // Noncompliant {{Remove this code after the "continue" statement.}}

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
    foo(); // Noncompliant {{Remove this code after the "break" statement.}}
  }
  case 2:
    break; // OK
  case 3:
    return 42;
    break; // OK
  case 4:
    return 42;
    break; // Noncompliant
    foo(); // Noncompliant
    bar();
  default:
    foo();
    break; // OK
  }

  switch (a) {
  default:
    foo();
    break;
  case 1:  // OK
    bar();
  }

  while (true) {
    if (condition) {
      return 42;
      break;  // Noncompliant
    }
  }

}

function tryCatchFinally() {

  try {
    var h;
    throw ("MyException");
    foo(); // Noncompliant {{Remove this code after the "throw" statement.}}
  } catch (e) {
    foo();
    throw ("MyException");
  } finally {
    foo();
  }

  try {
    return foo();
  } catch (e) {
    bar(); // OK
  }

  try {
    throw ("MyException");
  } catch (e) {
    foo(); // OK
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
    foo(); // Noncompliant [[secondary=-6,-4,-2]] {{Remove this unreachable code.}}
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

function declarations() {
  return;
  var foo, bar;

  return;
  var foo, bar = 42; // Noncompliant, with initializer

  return;
  let foo, bar; // Noncompliant, "let" declarations are not hoisted

  return;
  const foo, bar; // Noncompliant, "const" declarations are not hoisted
}
