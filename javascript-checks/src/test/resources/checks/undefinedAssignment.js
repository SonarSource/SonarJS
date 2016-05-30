var a = undefined;  // Noncompliant {{Use null instead.}}
//      ^^^^^^^^^
a = undefined;      // Noncompliant
//  ^^^^^^^^^

undefined = 1;      // OK
