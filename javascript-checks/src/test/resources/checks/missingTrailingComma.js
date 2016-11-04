// 1. OBJECTS

var obj = {};                               // OK

var obj = {                                 // OK
    // some comment
};

var obj = {fname: "joe", lname: "Smith"};   // OK

var obj = {fname: "joe", lname: "Smith",};  // OK

var obj = {
  fname: "joe", 
  lname: "Smith"};                          // OK

var obj = {
  fname: "joe",
  lname: "Smith"                            // Noncompliant {{Add a trailing comma to this item of the list.}}
};

var obj = {
  fname: "joe",
  lname: "Smith",                           // OK
};

var obj = {
  fname: "joe", lname: "Smith"              // Noncompliant
//              ^^^^^^^^^^^^^^
};

var short = {
  length: 0                                 // Noncompliant
};


// 2. ARRAYS

var arr = [];                               // OK

var arr = ["joe", "Smith"];                 // OK

var arr = ["joe", "Smith",];                // OK

var arr = [
  "joe",
  "Smith"];                                 // OK

var arr = [
  "joe",  "Smith"                           // Noncompliant  
//        ^^^^^^^
];

var arr = [
  "joe",
  "Smith",                                  // OK
];

var arr = [
  "joe",,
  "Smith"                                 // Noncompliant
];


// 3. ARGUMENTS, NOT COVERED BY THE RULE

function foo (a, b, c,) {}                   // OK

function foo (
  a,
  b,
  c                                         // OK
) {}

x = foo(a, b, c);                           // OK

x = foo(
 a,
 b,
 c
);
