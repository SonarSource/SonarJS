function unknownObj() {
  var a = {}
  return a.foo;
}

function foo() {
  var s = "";
  s.length;
  s.lenght; // Noncompliant
//^^^^^^^^
}

function assignment_nok() {
  var s = "";
  x = s.lenght; // Noncompliant {{Remove this access to "lenght" property, it doesn't exist, as a built-in, on a String.}}
  s.lenght = 0; // Noncompliant
  x = Array.xxx; // Noncompliant {{Remove this access to "xxx" property, it doesn't exist, as a built-in, on this object.}}
}

function single_issue_per_tree() {
  var s = "";
  if (condition) {
    s = "other";
  }
  s.lenght; // Noncompliant
}

function not_ignore_conditions() {
  var s = foo() || "";
  if (s.bar) {// Noncompliant
    s.bar();// Noncompliant
  }

  if (!s.bar) {// Noncompliant
    foo(s);
  } else {
    s.bar();// Noncompliant
  }

  if (s.bar // Noncompliant
      && s.bar() == 42) {// Noncompliant
    foo();
  }

  if (!s.bar // Noncompliant
    || s.bar() == 42) {// Noncompliant
    foo();
  }

  s.bar ? // Noncompliant
    s.bar() : foo();// Noncompliant
  condition() ? s.bar : foo; // Noncompliant

  var foo = s.foo; // Noncompliant
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
