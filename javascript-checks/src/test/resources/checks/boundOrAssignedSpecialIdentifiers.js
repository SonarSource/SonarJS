/**
 * TESTS ON 'eval' AND ON 'arguments'
 */

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
  if (typeof a == 'undefined') {}  // OK
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


/**
 *  TESTS ON 'undefined'
 */

undefined = 42;              // Noncompliant {{Remove the modification of "undefined".}}

function undefined() {}      // Noncompliant {{Remove the modification of "undefined".}}

class undefined {}           // Noncompliant {{Remove the modification of "undefined".}}

function f() {
  var undefined = 1;         // Noncompliant {{Do not use "undefined" to declare a variable - use another name.}}
  var undefined;             // Noncompliant [[sc=7;ec=16]]
  let undefined;             // Noncompliant
  var a = 1;                 // OK
  a = undefined;             // OK
}

function g() {
  function foo() {};         // OK
  function undefined() {}    // Noncompliant {{Do not use "undefined" to declare a function - use another name.}}
}

function foo() {}            // OK

function foo(undefined) {}   // Noncompliant {{Do not use "undefined" to declare a parameter - use another name.}}

class Undefined {            // OK
  method(Undefined) {};      // OK
  method(undefined) {}       // Noncompliant {{Do not use "undefined" to declare a parameter - use another name.}}
}

function foo() {
  class undefined {}         // Noncompliant {{Do not use "undefined" to declare a class - use another name.}}
}
  

/**
 *  TESTS ON 'NaN'
 */

NaN = 42;              // Noncompliant {{Remove the modification of "NaN".}}

function NaN() {}      // Noncompliant {{Remove the modification of "NaN".}}

class NaN {}           // Noncompliant {{Remove the modification of "NaN".}}

function f() {
  var NaN = 1;         // Noncompliant {{Do not use "NaN" to declare a variable - use another name.}}
  var a = NaN;         // OK
}

function g() {
  function NaN() {}    // Noncompliant {{Do not use "NaN" to declare a function - use another name.}}
}

function foo(NaN) {}   // Noncompliant {{Do not use "NaN" to declare a parameter - use another name.}}

class nan {            // OK
  method(NaN) {}       // Noncompliant {{Do not use "NaN" to declare a parameter - use another name.}}
}

function foo() {
  class NaN {}         // Noncompliant {{Do not use "NaN" to declare a class - use another name.}}
}
  

/**
 *  TESTS ON 'Infinity'
 */

Infinity = 42;              // Noncompliant {{Remove the modification of "Infinity".}}

function Infinity() {}      // Noncompliant {{Remove the modification of "Infinity".}}

class Infinity {}           // Noncompliant {{Remove the modification of "Infinity".}}

function f() {
  var Infinity = 1;         // Noncompliant {{Do not use "Infinity" to declare a variable - use another name.}}
  var a = Infinity;         // OK
}

function g() {
  function Infinity() {}    // Noncompliant {{Do not use "Infinity" to declare a function - use another name.}}
}

function foo(Infinity) {}   // Noncompliant {{Do not use "Infinity" to declare a parameter - use another name.}}

class infinity {            // OK
  method(Infinity) {}       // Noncompliant {{Do not use "Infinity" to declare a parameter - use another name.}}
}

function foo() {
  class Infinity {}         // Noncompliant {{Do not use "Infinity" to declare a class - use another name.}}
}
