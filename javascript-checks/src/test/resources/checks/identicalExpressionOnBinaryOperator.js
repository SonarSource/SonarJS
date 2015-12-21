/**
 * NOK
 */
a == a; // Noncompliant {{Correct one of the identical sub-expressions on both sides of operator "=="}}

a != a; // Noncompliant {{Correct one of the identical sub-expressions on both sides of operator "!="}}

a == b && a == b // Noncompliant [[sc=11;ec=17;secondary=+0]]

a == b || a == b // Noncompliant

5 / 5; // Noncompliant

5 - 5; // Noncompliant

a << a; // Noncompliant

/**
 * OK
 */
1 << 1;

a !== a;

a === a;

a == b;

a != b;

a === b;

a !== b;

a == b && a == c

a == b || a == c

5 / x;

5 - x;

function f() {
  if (+a !== +a);
}
