
if (mySet.size < 0) { } // Noncompliant {{Fix this expression; size of "mySet" is always greater or equal to zero.}}
//  ^^^^^^^^^^^^^^
if (myMap.size < 0) { } // Noncompliant {{Fix this expression; size of "myMap" is always greater or equal to zero.}}
//  ^^^^^^^^^^^^^^

if (arr.length < 0) { } // Noncompliant {{Fix this expression; length of "arr" is always greater or equal to zero.}}
//  ^^^^^^^^^^^^^^

if (arr.length >= 0) { } // Noncompliant {{Fix this expression; length of "arr" is always greater or equal to zero.}}
//  ^^^^^^^^^^^^^^^

// OK

if (arr.length < 1) { }
if (arr.length > 0) { }
if (arr.length <= 1) { }
if (arr.length >= 1) { }
if (arr.length < 50) { }
if (arr.length < 5 + 0) { }
if (obj.size() >= 0) { }

let expr = foo.bar().length >= 0; // Noncompliant {{Fix this expression; length of "foo.bar()" is always greater or equal to zero.}}

let obj = { };
obj.length = -42;
if (obj.length < 0) {} // Noncompliant, FP
