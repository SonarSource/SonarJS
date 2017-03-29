function emptyFunctionBody() {}

functionWithoutBlock = x => 1;

function global_variables_should_not_be_tracked() {
  global1 = null;
  if (global1) {} // global1 may have been updated since the assignment at the previous line
  if (!global1) {}
}

function unknown_value() {
  var a = random();``
  if (a) {}
}

function undefined_variable() {
  var a;
  if (a) {} // OK, dead code
}~

function null_variable() {
  var a = null;
  if (a) {} // OK, dead code
}

function function_parameter(param1) {
  if (param1) {}
  param1 = null;
  if (param1) {} // OK, dead code
}

function function_arguments() {
  arguments = null;
  if (arguments) {} // OK, dead code
}

function not_condition() {
  var a;
  if (!a) {} // Noncompliant {{Remove this expression which always evaluates to "true".}}
}

function and_condition() {
  var a = random();
  if (a && !a) {} // OK, dead code
  while (a && !a) {} // OK, dead code
  do {} while (a && !a) // OK, dead code
  for(;a && !a;) {} // OK, dead code
}

function ternary_operator() {
  var x
  x ? 0 : 42; // OK, dead code
  x = foo();
  (x && !x) ? 0 : 42; // OK, dead code
}

function condition_in_expression() {
  var x = foo();
  return x && x !== null && foo; // Noncompliant
//            ^^^^^^^^^^

}

function or_condition() {
  var a = random();
  if (a || !a) {} // Noncompliant
}

function true_literal() {
  if (true) {} // Noncompliant
}

function false_literal() {
  if (false) {} // OK, dead code
}

function while_true() {
  while (true) { // OK
    foo();
  }

  while (1) { // OK
   foo();
  }
}

function do_while_true() {
  do {
    foo();
  } while (true); // OK
}

function for_true() {
  for (;true;) { // OK
    foo();
  }
}

function compound_assignment() {
  var a;
  a |= foo();
  if (a) {}
}

function decrement() {
  var a;
  for (var i = 3; i; i--) {
    a = foo()
  }
  if (a) {}
}

function increment() {
  var a;
  for (var i = -3; i; i++) {
    a = foo()
  }
  if (a) {}
}

function loop() {
  var a;
  while (condition()) {
    if (!a) {
      a = 42;
    }
  }
}

function function_arguments() {
  if (arguments) {} // Noncompliant
}

function for_in(obj) {
  for (var prop in obj) {
    if (prop) {}
  }
  prop = null;
  for (prop of obj) {
    if (prop) {}
  }
}

function switch_case(p) {
  var a = null;
  switch (p) {
    case a:
      doSomething();
  }
}

function try_catch() {
  var a;
  try {
    a = random();
    doSomethingWhichMayThrowAnException();
    return a;
  } catch (e) {
    if (a) {}
  }
}

function nested_if() {
  var a = random();
  if (a) {
    if (a) {  // Noncompliant

    }

    a = random();
    if (a) {   // OK
    }
  }
}

function tro(x, y) {
  x = y && true;
  x = y && false;
  x = true && y;  // Noncompliant
  x = false && y;  // OK, dead code

  x = y || true;
  x = y || false;
  x = true || y;  // OK, dead code
  x = false || y;  // Noncompliant

  if (y && true) {} // Noncompliant
  if (y && false) {} // OK, dead code
  if (true && y) {} // Noncompliant {{Remove this expression which always evaluates to "true".}}
  if (false && y) {} // OK, dead code

  if (y || true) {} else {}// OK, dead code
  if (y || false) {} // Noncompliant
  if (true || y) {} else {} // OK, dead code
  if (false || y) {} // Noncompliant  {{Remove this expression which always evaluates to "false".}}
}

function logical_and(p1, p2, p3) {
  var combi = p1 && p2 == 42 && p3 === null;
  if (combi) {
    if (p1) {} // Noncompliant
    if (p3 == null) {} // Noncompliant
  }
}

function strict_equality(p1) {
  if (p1 === 0) {
    if (p1 === 0) {}      // Noncompliant always true
    if (p1 == 0) {}       // Noncompliant always true
    if (p1 === "") {}     // OK, dead code
    if (p1 != 0) {}       // OK, dead code
    if (p1 == "") {}      // OK Can't tell, yet
    if (p1 != "str") {}   // OK Can't tell
  }

  if (p1 !== 0) {
    if (p1 === 0) {}      // OK, dead code
    if (p1 == 0) {}       // OK Can't tell
  }

}

function aka_ternary(a, b, c) {
  var y;

// if 'a' is truthy assign '[]' otherwise 'b'
  y = a && [] || b;
  y = a && {} || b;
  y = a && 42 || b;
  y = a && "hello" || b;
  y = a && new Object() || b;
  y = a && ([]) || b;
  y = a && (new Object()) || b;

  // still raise issue for falsy literals
  y = a && 0 || b; // Noncompliant
  y = a && "" || b; // Noncompliant

  y = a && b && [] || c;
}

function ignore_assignment_expression() {
  var x, y;

  while ((x = y = 42) && condition) {
    doSomething();
  }

  while ((x = y = 0) || condition) {
    doSomething();
  }

  if ((x = 0) || foo(x)) {
    doSomething();
  }
}

function truthy_literal() {
  if (42) { // OK, all truthy literals are ignored (See "aka_ternary")
  }
}
