a.indexOf("str") > 0;     // NOK
a.indexOf(a) > 0;         // NOK

a.indexOf("str", 1) > 0;  // OK
a.indexOf("str") > -1;    // OK
