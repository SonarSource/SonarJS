
function compliant(x: number) {
  label0:
  while (x < 0) {
    x++;
    break label0;
  }

  label1: switch (x) {
    case 0:
      label2: for (let i = 0; i < 3; i++) {
        if (x % i == 1) {
          break label1;
        } else {
          break label2;
        }
        return 3;
      }
    default:
      return 0;
  }
}

function nonCompliant(x: number) {
  label0: // Noncompliant
  if (x > 0) {
    return 0;
  }

  label1: const val = 1; // Noncompliant
}
