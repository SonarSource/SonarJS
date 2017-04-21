function sayHello() {
  eval(myExpr);            // Noncompliant
//^^^^
  anotherFunction("2+2"); // OK
  `eval` ();              // OK
  eval("2+2"); // OK with literal
  eval();      // OK when empty
  `${eval(myExpr)}`;            // Noncompliant {{Remove this use of the "eval" function.}}
}

class C {
    constructor () {
        super();
    }
}
