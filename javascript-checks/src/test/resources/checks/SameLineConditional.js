// NOK
if (cond1) {
} if (cond2) { // Noncompliant {{Move this "if" to a new line or add the missing "else".}}
}

if (cond1) {
} else if (cond2) {
} if (cond3) { // Noncompliant
}

function foo() {
  if (cond1) {
  } if (cond2) { // Noncompliant
  }
}

switch(42) {
  case 1:
    if (cond1) {
    } if (cond2) { // Noncompliant
    }
  default:
    if (cond1) {
    } if (cond2) { // Noncompliant
    }
}

// OK

if (cond1) {
} else if (cond2) {
} else if (cond3) {
}


foo(); if (cond) bar();

if (cond1) foo(); if (cond2) bar(); // OK if everything is on one line
