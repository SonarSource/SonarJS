function f1() {
  i = i++; // Noncompliant
  i = j++;
  i = ++i;
  i++;
  i = i--; // Noncompliant
}
