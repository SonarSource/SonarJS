while(x) {
  break;
}

  label1: while(x) { // Noncompliant {{Refactor the code to remove this label and the need for it.}}
//^^^^^^
  break;
}

while(x) {
  continue;
}

label1: while(x) { // Noncompliant
  continue;
}

label1: { // Noncompliant
  break label1;
}
