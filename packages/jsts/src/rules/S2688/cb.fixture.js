if (n == NaN) {} // Noncompliant [[qf1,qf2=0]] {{Use the isNaN function to compare with NaN.}}
// fix@qf1 {{Use "isNaN()"}}
// edit@qf1 {{if (isNaN(n)) {}}}
// fix@qf2 {{Use "Number.isNaN()"}}
// edit@qf2 {{if (Number.isNaN(n)) {}}}

if (n != NaN) {}// Noncompliant [[qf3,qf4=0]] {{Use the isNaN function to compare with NaN.}}
// fix@qf3 {{Use "isNaN()"}}
// edit@qf3 {{if (!isNaN(n)) {}}}
// fix@qf4 {{Use "Number.isNaN()"}}
// edit@qf4 {{if (!Number.isNaN(n)) {}}}

if (Number.NaN === n) {}// Noncompliant [[qf5,qf6=0]] {{Use the isNaN function to compare with NaN.}}
// fix@qf5 {{Use "isNaN()"}}
// edit@qf5 {{if (isNaN(n)) {}}}
// fix@qf6 {{Use "Number.isNaN()"}}
// edit@qf6 {{if (Number.isNaN(n)) {}}}

switch (n) { case NaN: break; } // Noncompliant {{'case NaN' can never match. Use Number.isNaN before the switch.}}

if (n < NaN) {} // Noncompliant {{Use the isNaN function to compare with NaN.}}
