if (a) {
  if (b) {
  }
  if (c) {
  }
}

if (a) {
  if (b) {
  } else {
  }
}

if (a) {
} else if (b) { // NOK
  if (c) {
  }
}

if (a) {
} else if (b) {
  if (c) {
  }
} else {
}

if (a) { // NOK
  if (b) {
  }
}

if (a) { // NOK
  if (b) { // NOK
    if (c) {
    }
  }
}

if (a) { // NOK
  if (b) {
    if (c) {
    } else {
    }
  }
}

if (a) // NOK
  if (b) {
  }

if (a)
  if (b) {
  } else {
  }

if (a) { // OK
  if (b) { // OK
  }
  function f() {}
}

if (a) { // OK
  function f() {}
  if (b) { // OK
  }
}
