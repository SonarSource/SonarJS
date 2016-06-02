function fun() {
  var x;               // Noncompliant [[secondary=+3]] {{"x" hides or potentially hides a variable declared in an outer scope at line 5.}}
//    ^
}
var x;                 // <--  global x

var [y, z] = [1, 2];   // <--  global y, z

function fun(x) {      // Noncompliant
}

function fun(y) {      // Noncompliant
}

function fun(...x){    // Noncompliant
}

function fun() {
    let x;             // Noncompliant
    const y;           // Noncompliant
}

function* fun(x) {     // Noncompliant
}

class C {

    f(x) {             // Noncompliant
      var y;           // Noncompliant
    }

    *g (x){            // Noncompliant
       var y           // Noncompliant
    }
}

var a = () => {
    var x;             // Noncompliant
};

var obj = {

    get x () {
        var c;
    },

    doSomething () {
        var c;         // OK
    }
}

function fun1(){
  function fun2(){ // OK (build-in "arguments" doesn't raise an issue)
  }
}

function fun3(g){
  var s; // Noncompliant [[secondary=+3]] {{"s" hides or potentially hides a variable declared in an outer scope at line 61.}}
}
function fun4(g){
  s = 1
}
