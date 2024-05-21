function statement_after_break() {
  for (let k = 0; k < 3; k++) {
    if (true) {
      break;
      b = 2;
    }
  }
}

