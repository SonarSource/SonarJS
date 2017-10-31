function rspecExample(a, b, c) {
  a = b;
  c = a;
  b = c; // Noncompliant
//^^^^^
}

function identities(x) {
  let y = x;
  let z = x;
  z = y; // Noncompliant {{Review this useless assignment: "z" already holds the assigned value along all execution paths.}}
//^^^^^
}

function singleValueConstraints(x, y) {
  if (x === "" && y === "") {
    x = y; // Noncompliant {{Review this useless assignment: "x" already holds the assigned value along all execution paths.}}
//  ^^^^^
  }
}

function undef() {
  let x;
  let y;
  let z;
  z = x; // Noncompliant
//^^^^^
}

function nul() {
  let x = null;
  let y = null;
  y = x; // Noncompliant
//^^^^^
}

function literalsNotYetDone() {
  let x = 1;
  let y = 1;
  let z = x;
  z = y; // FN
}

function sameConstraintsAcrossBranches(z) {
  let x;
  let y = z;
  if (check(x)) { // function using `x` in condition forces constraint to ANY_VALUE
    y = x;
  }
  read(y);

  y = z;
}

function differentStrictConstraints(x, y) {
  if (x === "" && y === 0) {
    x = y; // OK
  }
}

function unconstrainedSymbolicValues(x, y) {
  x = y; // OK
}

function unknownSymbolicValues() {
  u1 = u2; // OK
}

function differentIdentities(x, y) {
  let z = y;
  z = x; // OK
}

function nonSingleValueConstraints(x, y) {
  if (x === "hello" && y === "hello") {
    x = y; // OK
  }
}

function assignmentsWithOperation() {
  let x = 0;
  let y = x;
  y *= x; // OK
}

function exceptions() {
  let x = "";
  let y = {
    foo() {
      return "";
    }
  }

  x = y.foo(); // FN we don't evaluate properties

  let array = [0];
  let e = 0;
  e = array[0]; // FN we ignore subscript values

  x = x // OK basic self-assignment already covered by S1656
}
