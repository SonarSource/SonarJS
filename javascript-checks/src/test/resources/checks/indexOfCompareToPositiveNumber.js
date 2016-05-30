  a.indexOf("str") > 0;     // Noncompliant {{0 is a valid index, but is ignored by this check.}}
//^^^^^^^^^^^^^^^^^^^^
a.indexOf(a) > 0;         // Noncompliant

a.indexOf("str", 1) > 0;  // OK
a.indexOf("str") > -1;    // OK
