var i = 12;

  label: // Noncompliant {{Remove this "label" label.}}
//^^^^^
if (i % 2 == 0) {
  if (i == 12) {
    print("12");
    break label;
  }
  print("Odd number, but not 12");
}

outerLoop: // OK
for (i = 0; i < 10; i++) {
  for (j = 0; j < 10; j++) {
    print("Loop");
    break outerLoop;
  }
}
