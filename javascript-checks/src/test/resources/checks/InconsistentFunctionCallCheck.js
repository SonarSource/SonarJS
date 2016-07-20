function foo(){
}

var x = external();

x();
var xx = new x(); // Noncompliant [[secondary=-1]] {{Correct the use of this function; on line 6 it was called without "new".}}
//       ^^^^^


foo();
foo(1);

function MyObj() {
}

var obj = new MyObj();
  MyObj(); // Noncompliant [[secondary=-1]] {{Correct the use of this function; on line 17 it was called with "new".}}
//^^^^^

obj = new MyObj();
MyObj();
