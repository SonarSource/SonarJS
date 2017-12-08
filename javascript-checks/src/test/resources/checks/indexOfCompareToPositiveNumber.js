  a.indexOf("str") > 0;     // Noncompliant {{This check ignores index 0; consider using 'includes' method to make this check safe and explicit.}}
//^^^^^^^^^^^^^^^^^^^^
a.indexOf(a) > 0;         // Noncompliant

a.indexOf("str", 1) > 0;  // OK
a.indexOf("str") > -1;    // OK
