// Noncompliant@+1 {{Move this trailing comment on the previous empty line.}}
var a1 = b + c; // This is a trailing comment that can be very very long
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// This very long comment is better placed before the line of code
var a2 = /* not a trailing comment */ b + c;

// The following line if compliant with the default configuration of the rule
var a3 = "id"; // $NON-NLS-1$
