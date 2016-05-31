function f1() {
  i = i++; // Noncompliant {{Remove this increment or correct the code not to waste it.}}
//     ^^
  i = j++;
  i = ++i;
  i++;
  i = i--; // Noncompliant
}
