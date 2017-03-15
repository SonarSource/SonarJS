  label1: { // Noncompliant {{Refactor the code to remove this label and the need for it.}}
//^^^^^^
  break label1;
}

label2: function foo() {} // Noncompliant

while(x) {
  break;
}

label3: do { // OK, loop
  break;
} while (x);

label4: while(x) { // OK, loop
  continue;
}

while(x) {
  continue;
}

function bar() {}
