doSomething(a)     // NOK
 (b)

doSomething(a)(b)  // NOK
 (c)

doSomething(a)     // NOK
 (b)(c)

doSomething
 (a)               // NOK
 (b)

doSomething        // OK
 (a)(b)(c)

doSomething(a)     // OK

doSomething(a)(b); // OK


