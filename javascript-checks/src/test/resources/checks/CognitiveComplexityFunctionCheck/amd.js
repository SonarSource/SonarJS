// with threshold = 1

define([ "module" ], function() { // Noncompliant
  if (cond) {}
  if (cond) {}

  function foo() {
    if (cond) {}
  }
});

define([ "module" ], function() { // OK
  if (cond) {}

  function foo() { // Noncompliant
    if (cond) {}
    if (cond) {}
  }
});
