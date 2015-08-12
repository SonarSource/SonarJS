if (x) {}

function ok1() {}

function ok2() { // +1
  if (x) {      // +1
  }
  return 1; // +0
}

function ko1() { // +1
  if (x) {       // +1
    return 0;    // +1
  }
  return 1;      // +0
}

function ko2() { // +1
  if (x) {       // +1
  } else if (y) { // +1
  }
}

function * ko3() { // +1
  if (x) {         // +1
    return 0;      // +1
  }
  return 1;        // +0
}

function nesting() {   // +1 nesting
  function nested() {  // +1 nesting, nested
    if (x) {           // +1 nesting, nested
    }
    return 1;          // +0
  }
}

class c {
  ko() {        // +1
    if (x) {    // +1
      return 0; // +1
    }
    return 1;   // +0
  }
  ok1() {       // +1
    if (x) {    // +1
    }
    return 1;   // +0
  }
  ko2() {           // +1
    if (x) {        // +1
    } else if (y) { // +1
    }
  }
}

function ok() {  // +1
  return { 
    get x() {    // +0
      if (x) {}  // +1
      return 0;  // +1
    }
  };
}

function ko() {  // +1
  return {
    get x() {    // +0
      if (x) {   // +1
        return 0;// +1
      }
      return 1;  // +0
    }
  };
}

function ko() {  // +1
  return {
    get x() {    // +0
      if (x) {     // +1
        return 0;  // +1
      } else if (y) { // +1
      }
    }
  };
}
