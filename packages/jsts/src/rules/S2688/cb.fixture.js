if (n == NaN) {} // Noncompliant [[qf1,qf2=0]]
// fix@qf1 {{Use "isNaN()"}}
// edit@qf1 {{if (isNaN(n)) {}}}
// fix@qf2 {{Use "Number.isNaN()"}}
// edit@qf2 {{if (Number.isNaN(n)) {}}}

if (n != NaN) {}// Noncompliant [[qf3,qf4=0]]
// edit@qf3 {{if (!isNaN(n)) {}}}
// edit@qf4 {{if (!Number.isNaN(n)) {}}}

if (Number.NaN === n) {}// Noncompliant [[qf5,qf6=0]]
// edit@qf5 {{if (isNaN(n)) {}}}
// edit@qf6 {{if (Number.isNaN(n)) {}}}

switch (n) { case NaN: break; } // Noncompliant

if (n < NaN) {} // Noncompliant
