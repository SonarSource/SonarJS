a == NaN;   // Noncompliant [[secondary=+0]] {{Use a test of the format "a == a" instead.}}
//   ^^^
a != NaN;   // Noncompliant {{Use a test of the format "a != a" instead.}}
a === NaN;  // Noncompliant {{Use a test of the format "a === a" instead.}}
a !== NaN;  // Noncompliant {{Use a test of the format "a !== a" instead.}}

NaN == a;   // Noncompliant
NaN != a;   // Noncompliant
NaN === a;  // Noncompliant
NaN !== a;  // Noncompliant

a != a      // OK
