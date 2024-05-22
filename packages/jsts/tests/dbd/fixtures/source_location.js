function assignments(param) {
  if (1) {
    let x = 2;
  }
  let c = param.foo(x);
  if (y === 3) {
    x = 3;
  }
  let b = typeof x === 'string';
  if (y === 4) {
    x = 4;
  }
  if (y === 5) {
    x = 5;
  }
  a[i] = x;
  if (y === 6) {
    x = 6;
    c.numerator += x;
    a[i] += x;
  }
  x = null;
  y = null;
  if (y === 6) {
    x = 6;
  }
  x += c;
}

function calls(param) {
  let x;
  if (1) {
    x = 2;
  }
  param.foo(x);
  if (y === 3) {
    x = 3;
  }
  typeof x === 'string';
  if (y === 4) {
    x = 4;
  }
}
