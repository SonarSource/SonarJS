  !x in y; // Noncompliant {{Add parentheses to perform "in" operator before logical NOT operator.}}
//^^^^^^^
!x instanceof y; // Noncompliant {{Add parentheses to perform "instanceof" operator before logical NOT operator.}}

x in y;
x instanceof y;
!(x in y);
!(x instanceof y);
(!x) in y;
