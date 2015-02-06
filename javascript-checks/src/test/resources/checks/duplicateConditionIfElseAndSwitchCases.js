if (condition1) {
} else if (condition1) { // NOK
}

if (condition2) {
} else if (condition1) {
} else if (condition1) { // NOK
}

if (condition1) {
} else if (condition2) {
} else if (condition1) { // NOK
}

switch (a) {
  case 1:
  case 1:                // NOK
  default:
}

switch (a) {
  case 1:
  case 1:                // NOK
  case 2:
  default:
}

switch (a) {
  case 1:
  case 2:
  case 1:                // NOK
  default:
}
