for (i = 0; i < 10; i++) { // Noncompliant [[sc=1;ec=4;secondary=+2,+5;effortToFix=1]] {{Reduce the total number of "break" and "continue" statements in this loop to use one at most.}}
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

label: for (i = 0; i < 10; i++) { // Noncompliant
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
label: for (i = 0; i < 10; i++) { // Noncompliant
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
    for (i = 0; i < 10; i++) { // Noncompliant
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

// break and continue statements can not cross function boundaries
for (i = 0; i < 10; i++) { // OK
    (function*() {
        for (i = 0; i < 10; i++) { // Noncompliant
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

for (i = 0; i < 10; i++) { // Noncompliant [[effortToFix=2]]
  if (i % 3 == 1) {
    break;
  }
  if (i % 3 == 2) {
    continue;
  }
  if (i % 3 == 0) {
    continue;
  }
}
