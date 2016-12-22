function foo() {
  var s = "";
  s.length;
  s.lenght; // Noncompliant
//^^^^^^^^
}

function assignment() {
  var s = "";
  x = s.lenght; // Noncompliant {{Remove this access to "lenght" property, it doesn't exist, as a built-in, on a String.}}
  s.lenght = 0; // ok
  x = Array.xxx; // Noncompliant {{Remove this access to "xxx" property, it doesn't exist, as a built-in, on this object.}}
}

function single_issue_per_tree() {
  var s = "";
  if (condition) {
    s = "other";
  }
  s.lenght; // Noncompliant
}

function ignore_conditions() {
  var s = foo() || "";
  if (s.bar) {
    s.bar();
  }

  if (!s.bar) {
    foo(s);
  } else {
    s.bar();
  }

  if (s.bar && s.bar() == 42) {
    foo();
  }

  if (!s.bar || s.bar() == 42) {
    foo();
  }

  s.bar ? s.bar() : foo();
  condition() ? s.bar : foo; // also OK, extra caution

  var foo = s.foo; // Noncompliant FP
  if (foo) {
    doSomething();
  }

  if (s.hasOwnProperty("foo")) {
    s.foo(); // Noncompliant FP
  }
}

function primitive_wrappers(x) {
  new String(x).foo; // Noncompliant
  new Number(x).foo; // Noncompliant
  new Boolean(x).foo; // Noncompliant
}

function ember_api() {
  "foo".camelize();
  "foo".capitalize();
  "foo".classify();
  "foo".dasherize();
  "foo".decamelize();
  "foo".fmt();
  "foo".loc();
  "foo".underscore();
  "foo".w();
}
