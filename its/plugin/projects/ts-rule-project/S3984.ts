// OK
foo(new Error());
foo(TypeError);
throw new Error();
new LooksLikeAnError().doSomething();

// NOK
  new Error(); // Noncompliant
//^^^^^^^^^^^
new TypeError(); // Noncompliant
new MyError(); // Noncompliant
new A.MyError(); // Noncompliant


new A(function () {
  new SomeError(); // Noncompliant
});

new MyException(); // Noncompliant
