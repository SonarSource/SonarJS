function property() {
  var x;
  x.foo;   // Noncompliant {{TypeError can be thrown as "x" might be null or undefined here.}}
}

function builtin_property() {
  var str = "str";
  str.trim(); // OK
}

function chained_properties() {
  var str = "str";
  str.trim().trim(); // OK
  str.undefinedProperty.trim(); // OK, we don't know property "undefinedProperty" and consider it to have ANY_VALUE
}

function property_array() {
  var str = "str";
  str.trim().split("t")[0]; // OK
  str.trim().undefinedArray[0]; // OK
}

function element() {
  var x;
  x[1];    // Noncompliant
}

function unknown() {
  var y;
  foo(y);
  y = foo();
  y.foo;
}

function branch() {
  var z;
  if (cond) {
    z = foo();
  }
  z.foo();   // Noncompliant
}

function class_property() {
  class A {
  }
  A.foo = 42;
}

function var_and_function() {
  x.bar = 24;
  var x;
  function x() {}
  x.foo = 42;
}

function equal_null() {
  var x = foo();

  if (x != null) {
    x.foo();
  }

  if (null != x) {
    x.foo();
  }

  if (x == null) {
    x.foo();    // Noncompliant
  }
}

function equal_undefined() {
  var x = foo();

  if (x == undefined) {
    x.foo();     // Noncompliant
  }
}

function strict_equal_null() {
  var x = foo();

  if (x === null) {
    x.foo();    // Noncompliant
  } else {
    x.foo();
  }

}

function strict_not_equal_null() {
  var x = foo();

  if (x !== null) {
    x.foo();
  } else {
    x.foo();   // Noncompliant
  }
}

function ternary() {
  var x;
  if (condition) {
    x = foo();
  }

  x ? x.foo() : bar();  // Compliant
}

function duplicated_condition() {
  if (foo("bar")) {
    var x = bar();
  }

  if (foo("bar")) {
    x.foo();   // Noncompliant  FP!
  }
}

function stop_after_NPE() {
  var x;
  if (x.foo &&  // Noncompliant
      x.bar     // OK as we can't reach this point after previous issue
  ) {
  }
}

function loop_at_least_once() {
  var x;

  while (condition()) {
    x = foo();
  }

  x.foo();  // Noncompliant, FP? we should execute loop at least once?
}

function loop_with_condition() {
  var x;

  for(var i = 0; i < arr.length; i++){
    if (arr[i].isSomething) {
      x = foo(arr[i]);
    }
  }
  x.foo();  // Noncompliant (such code is not even compiled by Java as "x" might be not initialized)
}

function loop(arr) {
  var obj;
  for(var i = 0; i < arr.length; i++){
    if(i % 2 == 0){
      obj = foo();
    } else {
      obj.bar();   // Noncompliant, FP
    }
  }
}

function one_condition() {
  var x = foo();

  if (x == null) {
    foo();
  }

  if (x
      && x.foo != null) {  // Ok
  }
}

function one_more() {
  var x = foo();
  while (x != null && i < 10) {
  }

  if (!x) {
    return;
  }

  if (x.foo) {  // Ok
  }
}

function not_null_if_property_accessed() {
  var x = foo();

  if (x.foo) {
    if (x != null) {
    }
    x.foo();   // Ok
  }
}

function tested_copy() {
  var x;

  if (condition) {
    x = foo();
  }

  var copy = x;

  if (!copy) {
    return;
  }

  x.foo();
}

function typeof_testing() {
  var x;

  if (condition) {
    x = foo();
  }

  if (typeof x === 'function') {
    x.call();
  }

  if (typeof x === 'object') {
    x.call();
  }

  var y = foo();

  if (typeof y === 'undefined') {
    y.call();  // Noncompliant
  }
}

function assignment_left_first() {
  var x;

  foo[x=foo()] = foo(x.bar);  // Compliant, we first evaluate LHS of assignment
}

function array_assignment() {
  var x, y;
  x = 0;
  [x, y] = obj;
  x.foo;
  y.foo;
}

function object_assignment() {
  var x, y;
  x = 0;
  ({x, y} = obj);
  x.foo;
  y.foo;
}

function object_assignment_with_named_properties() {
  var x, y;
  x = 0;
  ({prop1:x, prop2:y} = obj);
  x.foo;
  y.foo;
}

function null_and_not_undefined() {
  var x = null;

  while (condition()) {
    if (x === null) {
      x = new Obj();
    }
    x.foo();
  }
}

function one_issue_per_symbol() {
  var x = foo();
  if (x == null) {}

  if (condition) {
    x.foo(); // Noncompliant
  } else {
    x.bar(); // no issue here as we already have issue for same symbol
  }
}

function for_of_undefined() {
  var undefinedArray;
  for(let i of undefinedArray) {        // Noncompliant
  }

  var nullArray = null;
  for(let i of nullArray) {             // Noncompliant
  }

  var initializedArray = [];
  for(let i of initializedArray) {      // OK
  }

  var x;
  for(x of obj) {                       // OK we should not care about x being undefined
  }
}


function async_function_undefined() {
  async function foo_implicit_return() { console.log("foo"); } // async function always return a Promise
  async function foo_return_undefined() { console.log("foo"); return undefined; } // async function always return a Promise
  foo_implicit_return().then(); // OK
  foo_return_undefined().then(); // OK
}
