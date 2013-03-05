for (i = 0; i < 10; i++) { // NOK
  for (j = 0; j < 10; j++) {
    if (j % 3 == 0) {
      break;
    }
  }
  if (i % 3 == 0) {
    break;
  }
}

for (i = 0; i < 10; i++) { // OK
  if (i % 3 == 0) {
    continue;
  }
}

// break statement inside of switch statement should not be taken into account
for (i = 0; i < 10; i++) { // OK
  switch (i) {
    case 0:
      break;
    default:
      break;
  }
}

// break and continue statements can not cross function boundaries
for (i = 0; i < 10; i++) { // OK
  (function() {
    for (i = 0; i < 10; i++) { // NOK
      for (j = 0; j < 10; j++) {
        if (j % 3 == 0) {
          break;
        }
      }
      if (i % 3 == 0) {
        break;
      }
    }
  })();
  if (i % 3 == 0) {
    break;
  }
}

label: if (true) {
  break;
}

for (i = 0; i < 10; i++) { // TODO false-positive
  label1: if (i % 3 == 0) {
    break label1;
  }
  label2: if (i % 3 == 0) {
    break label2;
  }
}
