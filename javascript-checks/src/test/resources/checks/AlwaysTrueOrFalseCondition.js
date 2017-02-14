function emptyFunctionBody() {}

functionWithoutBlock = x => 1;

function global_variables_should_not_be_tracked() {
  global1 = null;
  if (global1) {} // global1 may have been updated since the assignment at the previous line
  if (!global1) {}
}

function unknown_value() {
  var a = random();
  if (a) {}
}

function undefined_variable() {
  var a;
  if (a) {} // Noncompliant  [[sc=7;ec=8]] {{Change this condition so that it does not always evaluate to "false".}}
}

function null_variable() {
  var a = null;
  if (a) {} // Noncompliant
}

function function_parameter(param1) {
  if (param1) {}
  param1 = null;
  if (param1) {} // Noncompliant
}

function function_arguments() {
  arguments = null;
  if (arguments) {} // Noncompliant 
}

function not_condition() {
  var a;
  if (!a) {} // Noncompliant {{Change this condition so that it does not always evaluate to "true".}}
}

function and_condition() {
  var a = random();
  if (a && !a) {} // Noncompliant {{Change this condition so that it does not always evaluate to "false".}}
//         ^^
  while (a && !a) {} // Noncompliant
//            ^^
  do {} while (a && !a) // Noncompliant
//                  ^^
  for(;a && !a;) {} // Noncompliant
//          ^^
}

function ternary_operator() {
  var x
  x ? 0 : 42; // Noncompliant
//^
  x = foo();
  (x && !x) ? 0 : 42; // Noncompliant
//      ^^
}

function condition_in_expression() {
  var x = foo();
  return x && x !== null && foo; // Noncompliant
//            ^^^^^^^^^^
}

function or_condition() {
  var a = random();
  if (a || !a) {} // Noncompliant {{Change this condition so that it does not always evaluate to "true".}}
}

function true_literal() {
  if (true) {} // Noncompliant {{Change this condition so that it does not always evaluate to "true".}}
}

function false_literal() {
  if (false) {} // Noncompliant {{Change this condition so that it does not always evaluate to "false".}}
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
  if (arguments) {} // Noncompliant {{Change this condition so that it does not always evaluate to "true".}}
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

function big_number_of_paths() {
  var a = foo();
  var b = foo();
  var c = foo();
  var d = foo();
  var e = foo();
  var f = foo();
  var g = foo();
  var h = foo();
  var i = foo();
  
  if (a) {}
  if (b) {}
  if (c) {}
  if (d) {}
  if (e) {}
  if (f) {}
  if (g) {}
  if (h) {}
  if (i) {}
  
  var x;
  if (x) {} // false negative, too many paths to explore
  makeLive(a, b, c, d, e, f, g, h, i);
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
  x = false && y;  // Noncompliant

  x = y || true;
  x = y || false;
  x = true || y;  // Noncompliant
  x = false || y;  // Noncompliant

  if (y && true) {} // Noncompliant
  if (y && false) {} // Noncompliant
  if (true && y) {} // Noncompliant
  if (false && y) {} // Noncompliant

  if (y || true) {} // Noncompliant
  if (y || false) {} // Noncompliant
  if (true || y) {} // Noncompliant
  if (false || y) {} // Noncompliant
}

function logical_and(p1, p2, p3) {
  var combi = p1 && p2 == 42 && p3 === null;
  if (combi) {
    if (p1) {} // Noncompliant
    if (p3 == null) {} // Noncompliant
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
