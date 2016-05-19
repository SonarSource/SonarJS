!true;            // Noncompliant {{Remove the literal "true" boolean value.}}
!false;           // Noncompliant
a == false;       // Noncompliant {{Remove the literal "false" boolean value.}}
a == true;        // Noncompliant
a === false;      // OK
a === true;       // OK
a != false;       // Noncompliant {{Remove the literal "false" boolean value.}}
a != true;        // Noncompliant
a !== false;      // OK
a !== true;       // OK
false == a;       // Noncompliant
true == a;        // Noncompliant
false != a;       // Noncompliant
true != a;        // Noncompliant
false && foo();   // Noncompliant {{Remove the literal "false" boolean value.}}
foo() || true;    // Noncompliant {{Remove the literal "true" boolean value.}}

a == foo(true);   // OK
true < 0;         // OK
~true;            // OK
++ true;          // OK
!foo;             // OK
foo() && bar();   // OK

a == true == b    // Noncompliant
a == b == false    // Noncompliant
a == (true && b) == b //Noncompliant



!(true) // Noncompliant
a == (false) // Noncompliant
foo() || (true) // Noncompliant

true ? a : b    // Noncompliant
false ? a : b    // Noncompliant
var x = true ? a : b  // Noncompliant
x = a ? a :
  true? b : a   // Noncompliant
x = (true) ? a : b // Noncompliant

cond ? "true" : true // OK
