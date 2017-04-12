function global() {
  arguments.callee;             // Noncompliant {{Name the enclosing function instead of using the deprecated property "arguments.callee".}}
//^^^^^^^^^^^^^^^^
  arguments.caller;             // Noncompliant {{Remove this use of "arguments.caller".}}

  function f() {
    f.caller;                   // Noncompliant {{Remove this use of "f.caller".}}
//  ^^^^^^^^
    f.arguments;                // Noncompliant {{Remove this use of "f.arguments".}}
  }

  var g = function g() {
    g.caller;                   // Noncompliant
    var h = function () {
      g.arguments;              // Noncompliant
    }
  }

  var h = () => {
    arguments.callee;             // Noncompliant
    function e() {
      e.arguments;              // Noncompliant
    }
  }

  var c =
class
  {
    i()
    {
      i.caller                  // Noncompliant
      h.arguments;              // OK - out of scope
    }

    get e() {
      e.arguments;              // Noncompliant
    }
  }

  arguments.bugspot;            // OK
  myObject.caller;              // OK
  myObject.arguments.caller;    // OK
  myObject.callee;              // OK
  myObject.callee;              // OK

}
