function f1() {
  let i = 1;
  i = i++; // Noncompliant
  i = j++;
  i = ++i;
  i++;
  i = i--; // Noncompliant

  return i++; // Noncompliant
}
