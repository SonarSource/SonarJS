function main() {
  function noReturn() {
    var x = () => {return 1}
  }

  noReturn(); // OK
  (noReturn()); // OK
  ((noReturn())); // OK

  x = noReturn(); // Noncompliant {{Remove this use of the output from "noReturn"; "noReturn" doesn't return anything.}}
//    ^^^^^^^^
  var x = noReturn(); // Noncompliant
  foo(noReturn()); // Noncompliant

  if (condition) {
    noReturn().method(); // Noncompliant
  }

  for (var x in noReturn()) { }// Noncompliant
  for (var x of noReturn()) { }// Noncompliant

  var arrowFunc = (a) => noReturn(a); // OK
  var arrowFunc = (a) => (noReturn(a)); // OK
  boolVar ? noReturn() : doSomethingElse(); // OK
  noReturn() ? doSomething() : doSomethingElse(); // Noncompliant
  boolVar && noReturn(); // OK
  noReturn() && doSomething(); // Noncompliant
  boolVar || noReturn(); // OK


  var arrowImplicitReturn = (a) => a*2;
  x = arrowImplicitReturn(1); // OK

  var arrowReturnsNothing = () => {
    var x = () => {return 1}
  };

  x = arrowReturnsNothing(); // Noncompliant

  var arrowReturnsPromise = async () => {
    var x = () => {return 1}
  };

  x = arrowReturnsPromise(); // OK

  async function statementReturnsPromise() {
    var x = () => {return 1}
  }

  x = statementReturnsPromise(); // OK

  var funcExpr = function() {
    if (condition) {
      return;
    }

    doSomething();
  }

  funcExpr(); // OK
  foo(funcExpr()); // Noncompliant {{Remove this use of the output from "funcExpr"; "funcExpr" doesn't return anything.}}

  var funcExprReturnsPromise = async function() {
    if (condition) {
      return;
    }

    doSomething();
  }

  foo(funcExprReturnsPromise()); // OK


  function returnsValue() {
    if (condition) {
      return 42;
    }
  }

  // OK
  var x = returnsValue();
  returnsValue();


  x = (function(){}()); // Noncompliant {{Remove this use of the output from this function; this function doesn't return anything.}}
//     ^^^^^^^^^^^^

  (function(){}());
  !function(){}();

  await noReturn(); // OK with await

  return noReturn(); // OK with return

}
