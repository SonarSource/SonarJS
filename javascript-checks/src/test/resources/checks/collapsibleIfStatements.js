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
} else if (b) { // Noncompliant {{Merge this if statement with the nested one.}}
  if (c) {
  }
}

if (a) {
} else if (b) {
  if (c) {
  }
} else {
}

if (a) { // Noncompliant [[sc=1;ec=7;el=+0;secondary=+1]]
  if (b) {
  }
}

if (a) { // Noncompliant
  if (b) { // Noncompliant
    if (c) {
    }
  }
}

if (a) { // Noncompliant
  if (b) {
    if (c) {
    } else {
    }
  }
}

if (a) // Noncompliant
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
