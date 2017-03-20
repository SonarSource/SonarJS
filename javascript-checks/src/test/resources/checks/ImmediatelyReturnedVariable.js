function var_returned() {
  var x = 42; // Noncompliant {{Immediately return this expression instead of assigning it to the temporary variable "x".}}
//        ^^
  return x;
}

function let_returned() {
  let x = 42; // Noncompliant
  return x;
}

function const_returned() {
  const x = 42; // Noncompliant
  return x;
}

function code_before_declaration() {
  foo();
  var x = 42; // Noncompliant
  return x;
}

function thrown_nok() {
  const x = new Exception(); // Noncompliant {{Immediately throw this expression instead of assigning it to the temporary variable "x".}}
  throw x;
}

function thrown_ok() {
  throw new Exception();
}

function thrown_expression() {
  const x = new Exception();
  throw foo(x);
}

function thrown_different_variable() {
  const x = new Exception();
  throw y;
}

function code_between_declaration_and_return() {
  let x = 42;
  foo();
  return x;
}

function return_expression() {
  let x = 42;
  return x + 5;
}

function return_without_value() {
  let x = 42;
  return;
}

function not_return_statement() {
  let x = 42;
  foo(x);
}

function no_init_value() {
  let x;
  return x;
}

function pattern_declared() {
  let {x} = foo();
  return x;
}

function two_variables_declared() {
  let x = 42, y;
  return x;
}

function different_variable_returned() {
  let x = 42;
  return y;
}

function only_return() {
  return 42;
}

function one_statement() {
  foo();
}

function empty_block() {
}

function different_blocks() {
  if (foo) {
    let x = foo(); // Noncompliant
    return x;
  }

  try {
    let x = foo(); // Noncompliant
    return x;

  } catch (e) {
    let x = foo(); // Noncompliant
    return x;

  } finally {
    let x = foo(); // Noncompliant
    return x;
  }


}

var arrow_function_ok = (a, b) => {
  return a + b;
}

var arrow_function_no_block = (a, b) =>  a + b;

function variable_is_used() {
  var bar = {  // OK
     doSomethingElse(p) { },
     doSomething() {  bar.doSomethingElse(1);  }
  };
  return bar;
}

function two_declarations() {
  if (true) {
    var x = foo(); // Noncompliant
    return x;
  } else {
    var x = bar();
    return x + 42;
  }
}

function homonymous_is_used() {
  const bar = {           // Noncompliant
     doSomethingElse(p) { var bar = 2; return p + bar; },
     doSomething() { return doSomethingElse(1); }
  };
  return bar;
}
