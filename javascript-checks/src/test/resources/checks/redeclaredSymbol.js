function fun() {}

function fun() {} // NOK

function* f() {
    function fun () {}     // OK - different scope

    function inner() {}

    function inner() {}    // NOK - already defined in scope
}

function* f() {           // OK - does not check for duplicated generator function
}

function fun_var1() {
  var a = 1;
  var a = 2; // NOK
}

function fun_var2(a) {
  var a = 1; // NOK
}

function fun_var3() {
  var i = 1;
  for (var i = 0; i < 10; i++) { // NOK
  }
}

function fun_var4() {
  var b = 1;
  var a = 2,
      b = 2; // NOK
}

function fun_var5(...a) {
  var a = 2;  // NOK
}

function fun_var6({a, b: {c}}) {
  var a;     // NOK
  var c;     // NOK
}

function fun_var7({a:b}) {
  var a;     // OK
  var b;     // NOK
}

var arrowFunc = (a) => {
    var a;     // NOK
}

function fun_var8() {
    var a = 1;

    for (var a in arr) { } // NOK
}

var obj = {
    set x(x) {
        var c;
    },

    set y (y) {
         var c;   // OK
    }
};


var fun1;
function fun1() {              // NOK
}

function fun2() {
}
var fun2;                      // NOK

var fun3;
var fun = function fun3() {    // NOK
}

var foo1;
function* foo1() {             // NOK
}

function* foo2() {
}
var foo2;                      // NOK

var foo3;
var foo10 = function* foo3() {   // OK - foo3 not available in enclosing scope
}

let fun4;
function fun4() {              // NOK
}

const fun5 = "";
function fun5() {     // NOK
}

var foo = function() {}
var foo = function*() {}  // NOK
function foo(){}

function samePar(a, a, b) {}  // OK - handled by another rule DuplicateFunctionArgument
