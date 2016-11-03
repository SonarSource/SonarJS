function f() {
  foo();
}

function f() { } // Noncompliant {{Add a nested comment explaining why this function is empty or complete the implementation.}}
//       ^

function f() {
  // Comment explaining why this function is empty
}

var f = function() { foo(); };
var f = function() { }; // Noncompliant
//      ^^^^^^^^
var f = function() { /* Comment */ };

function* f() { foo(); }
function* f() { } // Noncompliant

class class1 {
  
  constructor() { }  // Noncompliant
  
  f() { foo(); }
  f() { } // Noncompliant
  *f() { foo(); }
  *f() { } // Noncompliant
  get f() { foo() }
  get f() { } // Noncompliant
  set f(x) { foo() }
  set f(x) { } // Noncompliant
  
  ["foo" + "bar"]() { foo(); }
  ["foo" + "bar"]() {} // Noncompliant
//^^^^^^^^^^^^^^^
  
}

let empty = () => 42;
let empty = () => { foo(); };
let empty = () => {}; // Noncompliant
//                ^^

function test_nested() {
  var foo = function() {} // Noncompliant
}
