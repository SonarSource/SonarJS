function accessParam(x) {
  x.bar;
}

function accessLocalVariable() {
  let x = null;
  x.bar;
}

let someGlobal = null;

function accessGlobal() {
  someGlobal.bar;
}

function accessReturnValue() {
  let x = Math.abs(42);
  x.bar;
}

function chainOfAssignments() {
  let x = null;
  let y = x;
  y.bar;
}

function accessReturnValueAndAssignment() {
  let x = f();
  let y = x;
  y.foo;
}
