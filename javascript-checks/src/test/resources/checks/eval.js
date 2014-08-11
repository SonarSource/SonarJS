function sayHello() {
  eval("2+2");            // NOK
  anotherFunction("2+2"); // OK
  `eval` ();              // OK
  `${eval()}`;            // NOK
}

class C {
    constructor () {
        super();
    }
}
