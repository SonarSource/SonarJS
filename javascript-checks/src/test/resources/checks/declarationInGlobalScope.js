// Variable declarations in the global scope

x1 = 1;                                // FN
var x2 = 1;                            // Noncompliant {{Define this declaration in a local scope or bind explicitly the property to the global object.}}
//  ^^ 
const x3 = 1;                          // OK, local scope
let x4 = 1;                            // OK, local scope

var x5;                                // Noncompliant
x5 = 1;                                // OK, issue only on the declaration

                                       // Noncompliant@+2
                                       // Noncompliant@+1
var y1, y2, y3;                        // Noncompliant

                                       // Noncompliant@+1
var z1, z2 = 1;                        // Noncompliant

location = loc1;                       // OK, built-inNoncompliant (note : "location" is a property of "window")  
window.location = loc2;                // OK
window = newWindow;                    // OK

if (!X1) var X1 = {};                  // Noncompliant

[a1, a2] = [1, 2];                     // FN, symbol table should be improved
[b1, b2, ...rest] = [1, 2, 3, 4];      // FN, symbol table should be improved

({c1, c2} = {c1:1, c2:2});             // FN, symbol table should be improved
                                       // Noncompliant@+1
var {d1, d2} = Ember;                  // Noncompliant
const {e1, e2} = Ember;                // OK

var foo1 = function() {};              // Noncompliant
var foo2 = function fooo() {};         // Noncompliant
var foo3 = (x => Math.sin(x));         // Noncompliant
//  ^^^^


// Function declarations in the global scope

function bar1() {};                    // Noncompliant {{Define this declaration in a local scope or bind explicitly the property to the global object.}}
//       ^^^^
window.bar2 = function() {};           // OK
this.bar3 = function() {};             // OK
self.bar4 = function() {};             // OK

function isNaN() {};                   // OK
window.isNaN = function() {};          // OK
isNaN = function() {};

variableThenFunction = 1;              // FN
function variableThenFunction(){};     // Noncompliant

function functionThenVariable(){};     // Noncompliant
functionThenVariable = 1;              // FN

function func10() {}                   // Noncompliant
var func10 = function() {}        
obj.func3('f3', function() {
  obj.func4(func10());                 // OK
});

window.func20 = function(days = 1) {}; // OK

export function exportedFunction(){};  // Noncompliant, this rule should not be used with ES2015 modules


// IIFE

(function baz(arg) {})(1);             // OK


// Variable and function declarations in local scope 

function bat1() {                      // Noncompliant
  var x;                               // OK
  [a, b] = [1, 2];                     // OK
  [a, b, ...rest] = [1, 2, 3, 4];      // OK
  ({a, b} = {a:1, b:2});               // OK
  
  function bat2() {};                  // OK
}


// Class

class MyClass {                        // OK
  constructor(x) {                     // OK
    this.x = x
  }
  meth() {}                            // OK
}

type A = number;
class A {}
