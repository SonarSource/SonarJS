function sayHello() {
  eval("2+2");            // Noncompliant
//^^^^
  anotherFunction("2+2"); // OK
  `eval` ();              // OK
  `${eval()}`;            // Noncompliant {{Remove this use of the "eval" function.}}
}

class C {
    constructor () {
        super();
    }
}
