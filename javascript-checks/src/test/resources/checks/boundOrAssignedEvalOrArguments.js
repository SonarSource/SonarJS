  eval = 42;              // Noncompliant {{Remove the modification of "eval".}}
//^^^^
function fun(){arguments++}        // Noncompliant {{Remove the modification of "arguments".}}
//             ^^^^^^^^^
++eval;          // Noncompliant {{Remove the modification of "eval".}}
var obj = { set p(arguments) { } };     // Noncompliant {{Do not use "arguments" to declare a parameter - use another name.}}
var obj = { set p(arg) { } };       // OK
function fun(){var eval;}        // Noncompliant {{Do not use "eval" to declare a variable - use another name.}}
try { } catch (arguments) { }    // Noncompliant {{Do not use "arguments" to declare a variable - use another name.}}
function x(eval) { }        // Noncompliant {{Do not use "eval" to declare a parameter - use another name.}}
function arguments() { }        // Noncompliant {{Do not use "arguments" to declare a function - use another name.}}
var y = function eval() { };        // Noncompliant {{Do not use "eval" to declare a function - use another name.}}
var f = new Function("arguments", "return 17;");

eval("");
function foo(a){arguments[0] = a;  // OK
  a = arguments;     // OK
}
var fun = function(){fun(arguments);} // OK

function fun() {
  var a = arguments.length == 0; // OK
  var b = arguments.length === 0; // OK
  var c = (arguments = 0) == 0;  // Noncompliant {{Remove the modification of "arguments".}}
}

function fun(...eval) {  // Noncompliant {{Do not use "eval" to declare a parameter - use another name.}}
}

function fun(arguments, ...a) {   // Noncompliant {{Do not use "arguments" to declare a parameter - use another name.}}
}

var f = function(eval) {  // Noncompliant {{Do not use "eval" to declare a parameter - use another name.}}
}

function fun(a) {  // OK
}

function fun(yield) {  // OK
}

/**
* Destructuring patern in declaration
*/
function fun ({eval}) {   // Noncompliant {{Do not use "eval" to declare a parameter - use another name.}}
var {arguments, } = eval;   // Noncompliant {{Remove the modification of "arguments".}}
}

/**
* Generator function
*/
function* fun(eval) {   // Noncompliant [[sc=15;ec=19]]
}

function foo(){
  let arguments = eval;    // Noncompliant
  const arguments = eval;  // Noncompliant
}


NaN = 42;// Noncompliant
Infinity = 42;// Noncompliant
undefined = 42;// Noncompliant

function foo() { var NaN; } // Noncompliant
function foo() { var Infinity; } // Noncompliant
function foo() { var undefined; } // Noncompliant

function foo(undefined) { var x = undefined; } // OK
