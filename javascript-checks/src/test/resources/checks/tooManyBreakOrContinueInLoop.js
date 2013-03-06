for (i = 0; i < 10; i++) { // NOK
  if (i % 3 == 0) {
    break;
  }
  if (i % 3 == 0) {
    continue;
  }
}

for (i = 0; i < 10; i++) { // OK
  if (i % 3 == 0) {
    break;
  }
}

label: for (i = 0; i < 10; i++) { // NOK
  for (j = 0; j < 10; j++) {
    break label;
  }
  if (i % 3 == 0) {
    break;
  }
}

// unlabeled break statement inside of switch statement should not be taken into account
for (i = 0; i < 10; i++) { // OK
  switch (i) {
    case 0:
      break;
    default:
      break;
  }
}

// but labeled should
label: for (i = 0; i < 10; i++) { // NOK
  switch (i) {
    case 0:
      break label;
    default:
      break label;
  }
}

// break and continue statements can not cross function boundaries
for (i = 0; i < 10; i++) { // OK
  (function() {
    for (i = 0; i < 10; i++) { // NOK
      if (i % 3 == 0) {
        break;
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

for (i = 0; i < 10; i++) { // OK
  label1: if (i % 3 == 0) {
    break label1;
  }
  label2: if (i % 3 == 0) {
    break label2;
  }
}
