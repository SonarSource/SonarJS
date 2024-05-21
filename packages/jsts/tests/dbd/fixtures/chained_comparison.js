function func() {
  let a = 10;
  let b = 20;
  let c = 30;
  let d = 30;
  let e = 50;
  let rslt = a < b && b <= c && c === d && d !== e && e !== 10;
  return rslt;
}

function func2() {
  let a = 10;
  let b = 20;
  let c = 30;
  let d = 30;
  let e = 50;
  let rslt = a < b && b <= c && c === d && d !== e && e !== 10;
  return rslt;
}

function nestedIs2(a, b, c, d) {
  let x;
  if (a === b && b === c && c === d) {
    x = 1;
  } else {
    x = 2;
  }
  x = 3;
}

function nestedIsAssignedToVariable(x, y, z) {
  let b = x() === y() && y() === z();
}

