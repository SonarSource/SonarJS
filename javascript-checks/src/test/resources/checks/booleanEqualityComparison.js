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
false && foo();   // Ok covered by always-true-false-condition rule

a == foo(true);   // OK
true < 0;         // OK
~true;            // OK
++ true;          // OK
!foo;             // OK

a == true == b    // Noncompliant
a == b == false    // Noncompliant
a == (true == b) == b //Noncompliant



!(true) // Noncompliant
a == (false) // Noncompliant

true ? a : b     // Ok covered by always-true-false-condition rule
cond ? "true" : true // OK
