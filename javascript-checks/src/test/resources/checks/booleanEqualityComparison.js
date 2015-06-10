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


// NOK
!(true)
a == (false)
foo() || (true)

true ? a : b    // NOK
false ? a : b    // NOK
var x = true ? a : b  // NOK
x = a ? a :
  true? b : a   // NOK
x = (true) ? a : b // NOK

cond ? "true" : true // OK
