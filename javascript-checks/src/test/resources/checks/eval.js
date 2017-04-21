function sayHello() {
  eval(myExpr);            // Noncompliant
//^^^^
  anotherFunction("2+2"); // OK
  `eval` ();              // OK
  eval("2+2"); // OK with literal
  eval();      // OK when empty
  `${eval(myExpr)}`;            // Noncompliant {{Review the arguments of this "eval" call to make sure they are validated.}}
}

class C {
    constructor () {
        super();
    }
}
