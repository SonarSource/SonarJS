var a = 0;                // OK

function fun() {
  var a = 0;              // Noncompliant {{Remove the declaration of the unused 'a' variable.}}
//    ^
  var b = 1;              // OK
  return b;
}

function fun() {
  var a = 0;              // OK
  function nested() {     // Noncompliant {{Remove unused function 'nested'.}}
    a =  1;
  }
}

function fun() {
  var a = 0;              // Noncompliant {{Remove the declaration of the unused 'a' variable.}}
  function nested(a) {    // Noncompliant {{Remove unused function 'nested'.}}
    a =  1;
  }
}

function fun() {
    let a = 0;              // Noncompliant
    const b = 1;            // Noncompliant
    let c                   // OK
    return c;
}

function* fun() {
    var a = 0;              // Noncompliant
    var b = 1;              // OK
    return b;
}

function fun() {
  function f1() { console.log("f1"); }        // OK
  f1();
}

function fun() {
  var f1 = function() { console.log("f1"); }  // Noncompliant {{Remove the declaration of the unused 'f1' variable.}}
}

function fun() {
  function f1() { console.log("f1"); }        // Noncompliant {{Remove unused function 'f1'.}}
}

class C {
    f() {
        var a;              // Noncompliant
    }
}

var f = (p) => {
    var x;                  // Noncompliant
    var y = p.y;            // Noncompliant
}

var f = p => {
  var x;                    // Noncompliant
}

try {
} catch (e) {               // OK
}

function foo(){
var x1 = 1,              // OK
  y1 = -x1;               // OK
  foo(y1)
}

function foo(){
  var x = 1;               // Noncompliant
  var x = 2;              // Noncompliant

  class A {}      // OK, ignore anything except variables and functions
}

bar(function unusedFunctionExpression() {});  // OK, ignore function expression

function Person() {
  this.name = null;

  this.getName = function() {   // OK
    return name;
  }
}

function objectDestructuringException(obj) {
  var {a, b, c, ...interestingProps} = obj; // OK
  foo(interestingProps);

  var {a1, b1, c1} = obj; // Noncompliant
//         ^^
  foo(a1, c1);

  var {a2, b2, c2, ...interestingProps2} = obj; // Noncompliant
//                    ^^^^^^^^^^^^^^^^^

  var {a3, b: b3, c3, ...interestingProps3} = obj; // Noncompliant
//            ^^
  foo(interestingProps3);

  var {} = obj;
}

function used_in_template_string() {
  const foo = '.';
  return new RegExp(`\\${foo}`);
}
