function binary(x) {
  x === null;
  x !== null;
  x == null;
  x != null;
}

function unary(x) {
  !x;
}

function binaryAnd() {
  let a = 1;
  let b = 2;
  if (a && b) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function binaryAndChained() {
  let a = 1;
  let b = 2;
  let c = 3;
  if (a && b && c) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function binaryOr() {
  let a = 1;
  let b = 2;
  if (a || b) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function binaryOrChained() {
  let a = 1;
  let b = 2;
  let c = 3;
  if (a || b || c) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function binaryAndOr() {
  let a = 1;
  let b = 2;
  let c = 3;
  if (a && b || c) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function nestedIs(a, b) {
  if (a === b && b === null) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function nestedIs2(a, b, c, d) {
  if (a === b && b === c && c === d) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function nestedIsNot(a, b) {
  if (a === b && b !== null) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function nestedIsNot2(a, b, c) {
  if (a !== b && b !== c) {
    let x = 1;
  } else {
    let x = 2;
  }
  let x = 3;
}

function nestedIsAssignedToVariable(x, y, z) {
  let a = x() === y();
  let b = x() === y() && y() === z();
}

function plusOperator(x, y) {
  let z = x + y;
  return x + y + z;
}

function unpackingExpression(param) {
  some_fn({ ...param });
  some_fn(...param);
  let d = { 'k1': 42, ...param };
}

function binaryAndWithFunctionCall() {
  let a = 1;
  let b = 2;
  if (a && unary(b)) {
    let x = 1;
  } else {
    let x = 2;
  }
}

function ifIn(d) {
  if ('k1' in d) {
    console.log("k");
  }
  if (!('k2' in d)) {
    console.log("k2");
  }
}

function binaryArithmeticOperators(x, y, z) {
  // plus
  let plus = x + y;
  let plusMultiple = x + y + z;

  // minus
  let minus = x - y;
  let minusMultiple = x - y - z;

  // multiply
  let multiply = x * y;
  let multiplyMultiple = x * y * z;

  // divide
  let divide = x / y;
  let divideMultiple = x / y / z;

  // mod
  let mod = x % y;
  let modMultiple = x % y % z;

  // power
  let power = x ** y;
  let powerMultiple = x ** y ** z;
}

function mixOfBinaryArithmeticOperators() {
  let mix = 5 * 1 + 2 * 3;
  let mix2 = 3 * 6 / 3;
  let mix3 = 9 % 5 ** 2;
  let mix4 = 2 + 3 + 4 + 5 * 3 + 2 + 7;
}

