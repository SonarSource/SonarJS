switch (foo()) {
  case 0:
    bar();
    break;
  case 1:
    l: while (true) bar(); // Noncompliant
    break;
}
