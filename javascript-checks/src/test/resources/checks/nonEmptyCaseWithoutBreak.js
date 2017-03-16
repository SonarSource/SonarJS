while(condition) {
  switch (param) {
    case 0: // OK
    case 1: // OK
      break;
    case 2: // OK
      return;
    case 3: // OK
      throw new Error();
    case 4: // Noncompliant {{End this switch case with an unconditional break, continue, return or throw statement.}}
      doSomething();
    case 5: // OK
      continue;
    default: // OK
      doSomethingElse();
  }
}

switch (param) {
  default: // Noncompliant
    doSomething();
  case 0: // OK
    doSomethingElse();
}

switch (param) {
  case 0: // OK
    doSomething(); break;
  case 1: // OK
    { break; }
  case 2: // Noncompliant [[sc=3;ec=7]]
    {  }
  case 3: // Noncompliant
    {  doSomething(); }
  case 4: // OK
    { { return; } }
  case 5: // OK
    ;
    break;
  default: // OK
    doSomethingElse();
}

switch (param) {
}


switch (param) {
  case a:
    break;
  case c:
    while(d) { doSomething(); }
    break;
  case g:
    break;
  case h || i:
    break;
  case g2:
    break;
  case j && k:
    break;
  case l ? m : n:
    break;
  case x: // Noncompliant
    if (f) {
      break;
    }
  case y: // OK
    if (condition) {
      return 0;
    } else {
      return 1;
    }
  default:
    doSomething();
}

function inside_function() {
  switch (param) {
    case 0: // Noncompliant
      doSomethingElse();
    case 1:
      break;
    default:
      doSomething();
  }
}

// with not executable clause
switch(x) {
  case a:
    break;
  case a:
    function f () {}
}

// with 0 case clauses
switch(x) {
  default:
    foo();
}

// case with parentheses
switch(x) {
  case (a):
    break;
  case (b):
    break;
}

// OK with comment
switch (x) {
  case 0:
    foo(); // fallthrough

  case 2:
    foo();
    // fall-through

  case 3:
    foo();
    // one more comment
    // fall through

  case 4:
    if (condition) {
      return foo();
    }
    /* falls through */

  case 5:
    foo();
    // passthrough because of this and that

  case 6:
    foo();
    // nobreak

  case 7:
    foo();
    // proceed

  case 8:  // Noncompliant
    if (condition) {
      return foo();
    }
  case 9: // some comment
  case 10:
    bar();
}
