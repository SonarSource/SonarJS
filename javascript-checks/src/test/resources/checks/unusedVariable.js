var a = 0;                // OK

function fun() {
  var a = 0;              // NOK
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
  var a = 0;              // NOK
  function nested(a) {
    a =  1;
  }
}

function fun() {
    let a = 0;              // NOK
    const b = 1;            // OK
    let c                   // NOK
    return c;
}

function* fun() {
    var a = 0;              // NOK
    var b = 1;              // OK
    return b;
}

class C {
    f() {
        var a;              // NOK
    }
}

var f = (p) => {
    var x;                  // NOK
    var y = p.y;            // NOK
}

var f = p => {
  var x;                    // NOK
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
  var x = 1;               // NOK
  var x = 2;
}