var a = 0;                // OK

function fun() {
  var a = 0;              // Noncompliant {{Remove the declaration of the unused 'a' variable.}}
//    ^
  var b = 1;              // OK
  return b;
}

function fun() {
  var a = 0;              // OK
  function nested() {
    a =  1;
  }
}

function fun() {
  var a = 0;              // Noncompliant
  function nested(a) {
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
}