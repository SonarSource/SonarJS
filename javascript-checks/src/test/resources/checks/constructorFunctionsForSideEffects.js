export default new MyConstructor();  // OK
var something = new MyConstructor(); // OK
something = new MyConstructor();     // OK
  new MyConstructor();                 // Noncompliant {{Either remove this useless object instantiation of "MyConstructor" or use it}}
//^^^^^^^^^^^^^^^^^^^
callMethod(new MyConstructor());     // OK
new MyConstructor().doSomething();   // OK
