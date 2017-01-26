function foo(){
}

var x = external();

x();
x();
var xx = new x(); // Noncompliant [[secondary=-1]] {{Correct the use of this function; on line 7 it was called without "new".}}
//       ^^^^^
x();


foo();
foo(1);

function MyObj() {
}

var obj = new MyObj();
  MyObj(); // Noncompliant [[secondary=-1]] {{Correct the use of this function; on line 19 it was called with "new".}}
//^^^^^

obj = new MyObj();
MyObj();

function bar() {
  function bar() {}
    var a = new bar();
  }
var b = bar(); // OK

Number(x);
new Number(x);
