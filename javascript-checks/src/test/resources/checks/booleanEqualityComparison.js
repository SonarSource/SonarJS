  !true;            // Noncompliant {{Simplify this unnecessary boolean operation.}}
// ^^^^
!false;           // Noncompliant
a == false;       // Noncompliant {{Refactor the code to avoid using this boolean literal.}}
//   ^^^^^
a == true;        // Noncompliant
a === false;      // OK
a === true;       // OK
a != false;       // Noncompliant {{Refactor the code to avoid using this boolean literal.}}
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
