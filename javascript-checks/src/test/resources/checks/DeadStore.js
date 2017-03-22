
var global1 = 42; // OK - global

function foo(){

  var x;  // OK - declaration

  var y = 2;  // Noncompliant [[sc=7;ec=8]] {{Remove this useless assignment to local variable "y"}}
  y = 3;   // Noncompliant {{Remove this useless assignment to local variable "y"}}
  y = 4;   // Noncompliant

  var z = 42; // Noncompliant {{Remove this useless assignment to local variable "z"}}
  if (condition()) {
    z = 1;
    doSomething(z);
  }

  var a = 42, b = a;
  doSomething(b);

  global2 = 1 // OK - global

  x = 42; // Noncompliant
  if (condition) {
    x = 2;
  } else {
    x = a || b;
  }
  foo(x);
}

function loops() {

  var i = 42;
  while(i < 10) {
    i = i + 1;
  }
  doSomething(i);

  var j;
  while (condition()) {
    j = k + 1; // Noncompliant
  }

}

function functionParameter(p) { // OK
}

function read_write() {
  var i = 42;
  var j = i++; // false negative: we don't handle ++ and -- for the moment
  doSomething(j);
}

function write_in_nested_function_expression_but_never_read() {
  var a = 42; // Noncompliant
  execute(function() {
    a = z; // Noncompliant
  });
}

function write_in_nested_function_expression() {
  var a = 42;
  executeConditionally(function() {
    a = z;
  });
  return a;
}

function read_in_nested_function_expression() {
  var a = 42;
  var f = function() {
    return a;
  };
  a = 1; // OK
  return f;
}

function read_in_nested_function_declaration() {
  var a = 42;
  function f() {
    return a;
  };
  a = 1; // OK
  return f;
}

function read_in_nested_method() {
  var a = 42;
  class A {
    method1() {
      return a;
    }
  };
  a = 1; // OK
  return new A();
}

function arrow_function() {
  doSomething(() => {
    var x = 42; // Noncompliant
    x = 43;
    return x;
  });
}

function blockless_arrow_function() {
  doSomething(() => 1);
}

class A {
  method1() {
    var x = 42; // Noncompliant
    return y;
  }
}

function let_variable() {
  if (condition()) {
    let x = 42; // Noncompliant
  }
}

function assignment_order() {
  var x = foo(); // OK
  x = bar(x);
  return baz(x);
}

function assignment_order_with_ternary() {
  var x = foo(); // OK
  x = x > 0 ? x : 0;
  return baz(x);
}

function assignment_in_lhs() {
  var i;
  x[i = foo()] = bar(i);  // OK
}

function try_catch_finally() {
  var x = foo();                  // OK, dead store, but there is a try statement in the function
  if (cond) {
    x = 1;
  } else {
    x = 2;
  }
  var z = 42;                      // OK, dead store, but there is a try statement in the function
  z = foo();                      // OK, dead store, but there is a try statement in the function
  try {
    var y = foo();                // OK, dead store, but there is a try statement in the function
  } catch (e) {
  } finally {
  }
}

function nesting() {
  var a = foo();                  // Noncompliant
  function nested_try_finally() {
    var x = foo();                // OK, dead store, but there is a try statement in the function
    try {
      var y = foo();              // OK, dead store, but there is a try statement in the function
    } finally {
    }
    try {
      var z = foo();              // OK, dead store, but there is a try statement in the function
    } finally {
    }
  }
  var b = foo();                  // Noncompliant
}

function with_nested_tries() {
  var a = foo();                  // OK, dead store, but there is a try statement in the function
  try {
    var y = foo();                // OK, dead store, but there is a try statement in the function
    try {
      var z = foo();              // OK, dead store, but there is a try statement in the function
    } finally {
    }
  } finally {
  }
}

function nesting_try_with_function() {
  var a = foo();                  // OK, dead store, but there is a try statement in the function
  try {
    function bar() {
      var z = foo();              // Noncompliant
    }
  } finally {
  }
  var b = foo();                  // OK, dead store, but there is a try statement in the function
}

//  -1, 0, 1, null, true, false, "" and void 0.
function ok_initializer_to_standard_value() {
  let [a, b] = [42, 1]; // Noncompliant {{Remove this useless assignment to local variable "b"}}
  foo(a);

  let x0 = -2;  // Noncompliant
  let x1 = -1;
  let x2 = 0;
  let x3 = 1;
  let x4 = null;
  let x5 = true;
  let x6 = false;
  let x7 = "";
  let x8 = void 0;
  let x9 = (void 0);
  let x10 = (void 42);// Noncompliant

  x1 = 42;
  foo(x1);
  x2 = 42;
  foo(x2);
  x3 = 42;
  foo(x3);
  x4 = 42;
  foo(x4);
  x5 = 42;
  foo(x5);
  x6 = 42;
  foo(x6);
  x7 = 42;
  foo(x7);
  x8 = 42;
  foo(x8);
  x9 = 42;
  foo(x9);

  x1 = -1;   // Noncompliant
  x2 = 0;   // Noncompliant
  x3 = 1;   // Noncompliant
  x4 = null;   // Noncompliant
  x5 = true;   // Noncompliant
  x6 = false;   // Noncompliant
  x7 = "";   // Noncompliant
  x8 = void 0; // Noncompliant
  x9 = (void 0); // Noncompliant

}
