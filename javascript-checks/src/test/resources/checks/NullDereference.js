function property() {
  var x;
  x.foo;   // Noncompliant {{TypeError can be thrown as "x" might be null or undefined here.}}
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

function FP_class_property() {
  class A {
  }
  A.foo = 42;
}

function FP_var_and_function() {
  x.bar = 24;
  var x;
  function x() {}
  x.foo = 42;
}

function FP_equal_null() {
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

function strict_equal_null() {
  var x = foo();

  if (x === null) {
//    x.foo();    // Noncompliant
  }

  if (x !== null) {
  //  x.foo();     // ??? x might me undefined here and thus raise as NPE
  }
}

function FP_ternary() {
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

  x.foo();  // Noncompliant, FP! we should execute loop at least once
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
