
// STRING LITERAL

// ok
foo("str");
x = "str";
"str".toUpperCase();
x = "first part" +
"second part"

// nok
"str";            // Noncompliant {{Refactor or remove this statement.}}
"str"             // Noncompliant
x = "first part"
  "second part";       // Noncompliant
//^^^^^^^^^^^^^^

// COMPARISONS

// ok
a = x == y;
var a = x == y;
foo(x == y)

// nok
  x == y;   // Noncompliant
//^^^^^^^
x == y;    // Noncompliant



function foo() {
"use strict"
}

function bar() {
'use strict';
}

new Object(); // is not covered by this rule
