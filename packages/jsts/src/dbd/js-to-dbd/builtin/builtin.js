function logicalAnd(x, y) {
  if (x) {
    return true;
  } else {
    return false;
  }
}

function logicalOr(x, y) {
  if (x) {
    return true;
  } else {
    if (y) {
      return true;
    } else {
      return false;
    }
  }
}

function nullCoalesce(x, y) {
  if (x) {
    return x;
  } else {
    return y;
  }
}
