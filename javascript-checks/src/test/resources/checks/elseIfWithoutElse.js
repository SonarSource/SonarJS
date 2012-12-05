if (x == 0) {
  x = 42;
}

if (x == 0) {
  x = 42;
} else {
  x = -42;
}

if (x == 0) {
  x = 42;
} else if (x == 1) {
  x = -42;
} else if (x == 2) { // NOK
  x = 0;
}

if (x == 0) {
  x == 42;
} else {
  if (x == 1) {
    x == -42;
  }
}
