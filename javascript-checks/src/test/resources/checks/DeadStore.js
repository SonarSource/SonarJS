
var global1 = 1 // OK - global

function foo(){

  var x  // OK - declaration

  var y = 2  // Noncompliant [[sc=7;ec=8]] {{Remove this useless assignment to local variable "y"}}
  y = 3   // Noncompliant {{Remove this useless assignment to local variable "y"}}
  y = 4   // Noncompliant
  
  var z = 0; // Noncompliant {{Remove this useless assignment to local variable "z"}}
  if (condition()) {
    z = 1;
    doSomething(z);
  }

  var a = 1, b = a;
  doSomething(b);

  global2 = 1 // OK - global

  x = 1; // Noncompliant
  if (condition) {
    x = 2;
  } else {
    x = a || b;
  }
  foo(x);
}

function loops() {

  var i = 0;
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
  var i = 0;
  var j = i++; // false negative: we don't handle ++ and -- for the moment
  doSomething(j);
}

function write_in_nested_function_expression_but_never_read() {
  var a = 0; // Noncompliant
  execute(function() {
    a = z; // Noncompliant
  });
}

function write_in_nested_function_expression() {
  var a = 0;
  executeConditionally(function() {
    a = z;
  });
  return a;
}

function read_in_nested_function_expression() {
  var a = 0;
  var f = function() {
    return a;
  };
  a = 1; // OK
  return f;
}

function read_in_nested_function_declaration() {
  var a = 0;
  function f() {
    return a;
  };
  a = 1; // OK
  return f;
}

function read_in_nested_method() {
  var a = 0;
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
    var x = 0; // Noncompliant 
    x = 1;
    return x;
  });
}

function blockless_arrow_function() {
  doSomething(() => 1);
}

class A {
  method1() {
    var x = 0; // Noncompliant
    return y;
  }
}

function let_variable() {
  if (condition()) {
    let x = 1; // Noncompliant
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
