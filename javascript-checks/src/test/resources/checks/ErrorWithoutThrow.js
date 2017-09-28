// OK
foo(new Error());
foo(TypeError);
throw new Error();

// NOK
  new Error(); // Noncompliant
//^^^^^^^^^^^
new TypeError(); // Noncompliant
new MyError(); // Noncompliant
new A.MyError(); // Noncompliant
