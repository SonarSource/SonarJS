
function compliant(x: number) {
  label0:
  while (x < 0) {
    x++;
    break label0;
  }

  label1: do {
    label2: for (let i = 0; i < 3; i++) {
      if (x % i == 1) {
        break label1;
      } else {
        break label2;
      }
      return 3;
    }
  } while (true);
}

function nonCompliant(x: number) {
  label0: // Noncompliant
  if (x > 0) {
    return 0;
  }

  label1: const val = 1; // Noncompliant
}
