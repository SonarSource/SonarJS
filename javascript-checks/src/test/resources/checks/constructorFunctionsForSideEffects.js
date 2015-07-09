var something = new MyConstructor(); // OK
something = new MyConstructor();     // OK
new MyConstructor();                 // NOK
callMethod(new MyConstructor());     // OK
new MyConstructor().doSomething();   // OK
