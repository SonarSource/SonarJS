function main() {
  function noReturn() {
    var x = () => {return 1}
  }

  noReturn(); // OK

  x = noReturn(); // Noncompliant {{Remove this use of the output from "noReturn"; "noReturn" doesn't return anything.}}
//    ^^^^^^^^
  var x = noReturn(); // Noncompliant
  foo(noReturn()); // Noncompliant
  noReturn().method(); // Noncompliant
  for (var x in noReturn()) { }// Noncompliant
  for (var x of noReturn()) { }// Noncompliant

  var arrowFunc = (a) => noReturn(a); // OK
  boolVar ? noReturn() : doSomethingElse(); // OK
  noReturn() ? doSomething() : doSomethingElse(); // Noncompliant
  boolVar && noReturn(); // OK
  noReturn() && doSomething(); // Noncompliant
  boolVar || noReturn(); // OK


  var arrowImplicitReturn = (a) => a*2;
  x = arrowImplicitReturn(1); // OK



  var funcExpr = function() {
    if (condition) {
      return;
    }

    doSomething();
  }

  funcExpr(); // OK
  foo(funcExpr()); // Noncompliant {{Remove this use of the output from "funcExpr"; "funcExpr" doesn't return anything.}}



  function returnsValue() {
    if (condition) {
      return 42;
    }
  }

  // OK
  var x = returnsValue();
  returnsValue();
}
