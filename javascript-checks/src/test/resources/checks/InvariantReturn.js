function alwaysReturnNull(p) { // Noncompliant [[id=1]]
  if (p) {
    return null;
//S ^^^^^^^^^^^^ 1
  } else {
    return null;
//S ^^^^^^^^^^^^ 1
  }
}

function differentExpressions(p) { // Noncompliant [[id=2]]
  if (p !== null) {
    return null;
//S ^^^^^^^^^^^^ 2
  } else {
    return p;
//S ^^^^^^^^^ 2
  }
}

function sameSymbolicValueSameConstraint(p) { // Noncompliant [[id=3]]
  var num = foo() - bar();
  var num2 = num;

  if (p) {
    return num;
//S ^^^^^^^^^^^ 3
  } else {
    return num2;
//S ^^^^^^^^^^^^ 3
  }
}

function differentConstraintOnSameSymbolicValue() { // Noncompliant [[id=4]]
    let x = foo() - bar();
    if (x === 0)
      return x;
//S   ^^^^^^^^^ 4
    return x;
//S ^^^^^^^^^ 4
}

function returnsTrue(p) { // Noncompliant
  if (p === true) {
    return p;
  } else {
    return true;
  }
}

function returnsSameLiteral(p, k) {
  function number() { // Noncompliant
    if (p) {
      return 42;
    } else {
      return 42;
    }
  }

  function string() { // Noncompliant
    var x = "str";
    if (p) {
      return "str";
    } else {
      return x;
    }
  }

  function okDifferentValues() {
    if (p) {
      return "str1";
    } else {
      return "str2";
    }
  }

  function okNotLiteral() {
    if (p) {
      return p;
    } else if (k) {
      return "str";
    }

    return "str";
  }
}

// OK

function returnsTrue(p) {
  if (p) {
    return true;
  } else {
    return true;
  }
}

function returnsFalse(p) {
  if (p) {
    return false;
  } else {
    return false;
  }
}

function returnsUndefined(p) {
  if (p) {
    return undefined;
  } else {
    return undefined;
  }
}

function oneReturn(p) {
  if (p) {
    foo();
  } else {
    bar();
  }
  return null;
}

function noReturn(p) {
  if (p) {
    foo();
  } else {
    bar();
  }
}

function pathWithoutReturn(p, k) {
  if (p) {
    return null;
  } else if (k) {
    return null
  }

  // implicit return of undefined
}

function pathWithoutReturn(p, k) {
  if (p) {
    return null;
  } else if (k) {
    return null
  }

  return;
}

function differentConstraintOnSameSymbolicValueNotImmutable(x) {
    if (x > 0)
      return x;
    return x;
}

function returnParenthesised() {
  if (cond1) {
    return null;
  }

  if (cond2) {
    return null;
  }

  return (42);
}
