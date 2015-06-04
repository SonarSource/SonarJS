!true;            // NOK
!false;           // NOK
a == false;       // NOK
a == true;        // NOK
a === false;      // OK
a === true;       // OK
a != false;       // NOK
a != true;        // NOK
a !== false;      // OK
a !== true;       // OK
false == a;       // NOK
true == a;        // NOK
false != a;       // NOK
true != a;        // NOK
false && foo();   // NOK
foo() || true;    // NOK

a == foo(true);   // OK
true < 0;         // OK
~true;            // OK
++ true;          // OK
!foo;             // OK
foo() && bar();   // OK

a == true == b    // NOK
a == b == false    // NOK
a == (true && b) == b //NOK


// RSPEC-1125 - Noncompliant Code Example
var booleanVariable = true;
if (booleanVariable == true) { /* ... */ }                 // NOK
if (booleanVariable != true) { /* ... */ }                 // NOK
if (booleanVariable || false) { /* ... */ }                // NOK
doSomething(!false);                                       // NOK

booleanVariable = a ? true : a == b;                       // NOK
booleanVariable = a ? false : a == b;                      // NOK
booleanVariable = a ?  a == b : true;                      // NOK
booleanVariable = a ?  a == b : false;                     // NOK
booleanVariable = a ?  true : false;                       // NOK
// End of RSPEC-1125 - Noncompliant Code Example

// RSPEC-1125 - Compliant Solution
if (booleanVariable) { /* ... */ }                         // OK
if (!booleanVariable) { /* ... */ }                        // OK
if (booleanVariable) { /* ... */ }                         // OK
doSomething(true);

booleanVariable = a || a == b;                             // OK
booleanVariable = !a && a == b;                            // OK
booleanVariable = !a || a == b;                            // OK
booleanVariable = a && a == b;                             // OK
booleanVariable = a;                                       // OK
// End of RSPEC-1125 - Compliant Solution

booleanVariable = true ? 1 : 2;                            // NOK
booleanVariable = false ? 1 : 2;                           // NOK

booleanVariable = a ? (true) : a == b;                     // NOK
booleanVariable = a ? (false) : a == b;                    // NOK
booleanVariable = a ? a == b : (true);                     // NOK
booleanVariable = a ? a == b : (false);                    // NOK

a ? true : b;                                              // OK
a ? true : doSomething();                                  // OK
a ? false : b;                                             // OK
a ? false : doSomething();                                 // OK
a ? b : true;                                              // OK
a ? doSomething() : true;                                  // OK
a ? b : false;                                             // OK
a ? doSomething() : false;                                 // OK
a ? true : b ? true : c;                                   // OK
a ? true : b ? true : c ? true : d;                        // OK

a ? true : !b;                                             // NOK
a ? true : b != c;                                         // NOK
a ? true : !(b == c);                                      // NOK
a ? !b : true;                                             // NOK
a ? b != c : true;                                         // NOK
a ? !(b == c) : true;                                      // NOK
a ? true ? 1 : 2 : 3;                                      // NOK
a ? b == c ? 1 : 2 : true;                                 // OK
a ? b == c : d ? e == f: false;                            // NOK
!a ? 1 : 2;                                                // OK

// jQuery - function dataAttr( elem, key, data )           // OK
data = data === "true" ? true :
    data === "false" ? false :
    data === "null" ? null :
    // Only convert to a number if it doesn't change the string
    +data + "" === data ? +data :
    rbrace.test( data ) ? jQuery.parseJSON( data ) :
    data;