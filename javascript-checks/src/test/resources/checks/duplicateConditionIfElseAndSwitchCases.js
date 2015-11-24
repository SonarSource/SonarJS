if (condition1) {
} else if (condition1) { // Noncompliant {{This branch duplicates the one on line 1.}}
}

if (condition2) {
} else if (condition1) {
} else if (condition1) { // Noncompliant [[sc=12;ec=22;secondary=-1]]
}

if (condition1) {
} else if (condition2) {
} else if (condition1) { // Noncompliant
}

switch (a) {
  case 1:
  case 1:                // Noncompliant {{This case duplicates the one on line 16.}}
  default:
}

switch (a) {
  case 1:
  case 1:                // Noncompliant
  case 2:
  default:
}

switch (a) {
  case 1:
  case 2:
  case 1:                // Noncompliant [[sc=8;ec=9;secondary=-2]]
  default:
}
