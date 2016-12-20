function empty() {
}


function one_return_with_value() {
  return 42;
}


function one_return_without_value() {
  return;
}


  function two_different_returns() { // Noncompliant [[id=two_different_returns]] {{Refactor this function to use "return" consistently.}}
//^^^^^^^^
  if (condition) {
    return;
//S ^^^^^^ two_different_returns {{Return without value}}
  } else {
    return 42;
//S ^^^^^^ two_different_returns {{Return with value}}
  }
}


    function implicit_return() { // Noncompliant [[id=implicit_return]]
      if (condition) {
        return 42;
//S     ^^^^^^ implicit_return {{Return with value}}
      }
    }
//S ^ implicit_return {{Implicit return without value}}

function with_throw() { // OK
  if (condition) {
    return 42;
  }

  throw exception;
}

var function_expression = function () { // Noncompliant
//                        ^^^^^^^^
  if (condition) {
    return 42;
  }
}

var simple_arrow_function = (a) => 42;

var arrow_function = (a) => { // Noncompliant
//                       ^^
  if (condition) {
    return 42;
  }
}

class A {
  method() { // Noncompliant
//^^^^^^
    if (condition) {
      return 42;
    }
  }
}

function unreachable_code() {
  foo();
  return 42;
  function foo(){}
}

// we ignore any function with "try" statement
function with_try() {
  try {
    return 42;
  } catch(e) {
    return true;
  }
}

function with_try_fn() {
  try {
    return 42;
  } catch(e) {
    foo();
  }
}
