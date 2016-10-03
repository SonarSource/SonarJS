function foo() {
  
  undefined = 42;                // OK
 
  var undefined;                 // OK

  var undefined = undefined;     // OK
  var undefined = 1;             // Noncompliant {{Remove the modification of "undefined".}}

  var a = 1, undefined = 2, b;   // Noncompliant {{Remove the modification of "undefined".}}
  var a = b = undefined = 3;     // Noncompliant {{Remove the modification of "undefined".}} 
  var a = undefined = b = 3;     // Noncompliant {{Remove the modification of "undefined".}}
//        ^^^^^^^^^ 
}

//(function immediatelyInvoked(a, b, undefined) {    // OK
//   
//}) ("hello", "world");
//
//(function immediatelyInvoked(a, b, undefined) {    // Noncompliant {{Do not use "undefined" to declare a parameter - use another name.}}
//  
//}) ("hello", "world", 10);
//
//function foo(undefined) {     // Noncompliant {{Do not use "undefined" to declare a parameter - use another name.}}
//};
