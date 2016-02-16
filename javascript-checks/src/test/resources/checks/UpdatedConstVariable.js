
const c1 = 1;
c1 = 2; // Noncompliant {{Correct this attempt to modify "c1" or use "let" in its declaration.}}

const c2 = 3;
var x = c2++;  // Noncompliant [[sc=9;ec=11;el=+0;secondary=-1]]

const c3;
if (condition) {
  c3 = 1;
} else {
  c3 = 2;     // OK, ignore syntax noncompliant with ES2015 documentation (constant should be initialized during declaration)
}

const c4 = 1;
var c4 = 2;   // Noncompliant
