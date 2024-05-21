function if_stmt(param) {
  if (1) {
    let x = 1;
  }
  x = 999;
}

function return_in_if() {
  if (1) {
    return 42;
  }
  x = 999;
}

function if_else(param) {
  if (1) {
    let x = 1;
  } else {
    let x = 2;
  }
  x = 999;
}

function return_in_else(param) {
  if (1) {
    let x = 1;
  } else {
    return 2;
  }
  x = 999;
}

function return_in_if_and_else(param) {
  if (1) {
    return 1;
  } else {
    return 2;
  }
  // unreachable
  let x = 999;
}

function if_elif_else(param1, param2) {
  if (1) {
    let x = 1;
  } else if (2) {
    let x = 2;
  } else {
    let x = 3;
  }
  x = 999;
}

function return_in_elif(param1, param2) {
  if (1) {
    let x = 1;
  } else if (2) {
    return 2;
  } else {
    let x = 3;
  }
  x = 999;
}

function two_elif(param1, param2) {
  if (1) {
    let x = 1;
  } else if (2) {
    let x = 2;
  } else if (3) {
    let x = 3;
  } else {
    let x = 4;
  }
  x = 999;
}

function if_elif(param1, param2) {
  if (1) {
    let x = 1;
  } else if (2) {
    let x = 2;
  }
  x = 999;
}

function nested_if() {
  if (1) {
    if (2) {
      let x = 1;
    }
    let x = 2;
  }
  x = 999;
}

function condition_as_parameter(condition) {
  if (condition) {
    let x = 1;
  }
  if (!condition) {
    let x = 2;
  }
  if (condition) {
    let x = 999;
  }
}

function foo(param) {
  // ...
}

function multiple_assignments(condition) {
  if (condition) {
    let x = 1;
  } else {
    let x = 2;
  }
  foo(x);
}

function missing_assignment(condition) {
  if (condition) {
    let x = 1;
  } else {
    let y = 42;
  }
  foo(x);
}

function cond_expression(p) {
  let x = p ? null : 42;
  x.some;
}

function nested_conditional_expressions(x, y) {
  return x > 42 ? x + y : 0 != y ? x - y : 0;
}

function if_without_else() {
  if (1) {
    let x = 2;
  }
  x = foo(x);
  if (y === 3) {
    console.log(y);
  }
}
