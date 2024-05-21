function basic(i) {
  while (i < 24) {
    console.log(i);
  }
}

function while_counting() {
  let i = 0;
  while (i < 24) {
    i = i + 1;
  }
  console.log(i);
}

function while_with_return(i) {
  while (i < 24) {
    console.log(i);
    return;
  }
}

function while_with_break(i) {
  while (i < 24) {
    console.log(i);
    break;
  }
}

function while_with_continue(i) {
  while (i < 24) {
    console.log(i);
    continue;
  }
}

function nested_while(i, y) {
  while (i < 24) {
    while (y < 42) {
      console.log(i);
    }
  }
}

function nested_while_counting() {
  let i = 0;
  while (i < 24) {
    let j = 0;
    while (j < 42) {
      console.log(j);
      j = j + 1;
    }
    i = i + 1;
  }
  console.log(i);
}

function while_and_if(i, cond) {
  while (i < 24) {
    if (cond) {
      console.log(i);
    }
  }
}

function while_local_variable() {
  let i = 0;
  let x = 0;
  while (i < 24) {
    if (i % 2 === 0) {
      i = i + 1;
      x = x + i;
    } else {
      x = x - i;
    }
  }
}

function while_and_condition(i, cond) {
  while (i < 24 && i >= 0) {
    i = i + 1;
    console.log(i);
  }
}

function while_or_condition(i, cond) {
  while (i < 24 || i >= 0) {
    i = i + 1;
    console.log(i);
  }
}

function for_loop_with_else_and_break(my_list) {
  for (let i of my_list) {
    if (i === 42) {
      break;
    }
    console.log(i);
  }
  console.log("But not 42");
  console.log("done");
}
