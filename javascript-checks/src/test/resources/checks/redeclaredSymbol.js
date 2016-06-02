function fun() {}

function fun() {} // Noncompliant [[secondary=-2]] {{Rename "fun" as this name is already used in declaration at line 1.}}
//       ^^^
function* f() {
    function fun () {}     // OK - different scope

    function inner() {}

    function inner() {}    // Noncompliant {{Rename "inner" as this name is already used in declaration at line 8.}}
}

function* f() {           // Noncompliant FP {{Rename "f" as this name is already used in declaration at line 5.}}
}

function fun_var1() {
  var a = 1;
  var a = 2; // Noncompliant {{Rename "a" as this name is already used in declaration at line 17.}}
}

function fun_var2(a) {
  var a = 1; // Noncompliant {{Rename "a" as this name is already used in declaration at line 21.}}
}

function fun_var3() {
  var i = 1;
  for (var i = 0; i < 10; i++) { // Noncompliant {{Rename "i" as this name is already used in declaration at line 26.}}
  }
}

function fun_var4() {
  var b = 1;
  var a = 2,
      b = 2; // Noncompliant {{Rename "b" as this name is already used in declaration at line 32.}}
}

function fun_var5(...a) {
  var a = 2;  // Noncompliant {{Rename "a" as this name is already used in declaration at line 37.}}
}

function fun_var6({a, b: {c}}) {
  var a;     // Noncompliant
  var c;     // Noncompliant
}

function fun_var7({a:b}) {
  var a;     // OK
  var b;     // Noncompliant
}

var arrowFunc = (a) => {
    var a;     // Noncompliant
}

function fun_var8() {
    var a = 1;

    for (var a in arr) { } // Noncompliant
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
function fun1() {              // Noncompliant
}

function fun2() {
}
var fun2;                      // Noncompliant

var fun3;
var fun = function fun3() {    // Noncompliant
}

var foo1;
function* foo1() {             // Noncompliant
}

function* foo2() {
}
var foo2;                      // Noncompliant

var foo3;
var foo10 = function* foo3() {   // OK - foo3 not available in enclosing scope
}

let fun4;
function fun4() {              // Noncompliant
}

const fun5 = "";
function fun5() {     // Noncompliant
}

var foo = function() {}
var foo = function*() {}  // Noncompliant
function foo(){} // Noncompliant

function samePar(a, a, b) {}  // OK - handled by another rule DuplicateFunctionArgument
