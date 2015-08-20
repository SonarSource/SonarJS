
// STRING LITERAL

// ok
foo("str");
x = "str";
"str".toUpperCase();
x = "first part" +
"second part"

// nok
"str";            // NOK
"str"             // NOK
x = "first part"
"second part"       // NOK

// COMPARISONS

// ok
a = x == y;
var a = x == y;
foo(x == y)

// nok
x == y    // NOK
x == y;    // NOK



function foo() {
"use strict"
}

function bar() {
'use strict';
}

new Object(); // is not covered by this rule