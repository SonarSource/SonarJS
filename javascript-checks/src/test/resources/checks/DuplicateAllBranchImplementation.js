function if_statement() {
  if (a) {
    first();
    second();
  } else if (b) {
    foo();
  } else {
    first();
    second();
  }

  if (a) {
    first();
    second();
  } else if (a) {
    first();
    second();
  }

  if (a) {          // Noncompliant {{Remove this conditional structure or edit its code blocks so that they're not all the same.}}
    first();
  } else {
    first();
  }

  if (a) {          // Noncompliant
    first();
    second();
  } else {
    first();
    second();
  }

  if (a) {  // Noncompliant
    first();
    second();
  } else if (b) {
    first();
    second();
  } else {
    first();
    second();
  }

}


function switch_statement() {

  switch (a) {  // Ok, no default
    case 1:
      first();
      second();
      break;
    case 2:
    case 3:
      first();
      second();
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 3:
      first();
      second();
      break;
    default:
      foo();
  }

  switch (a) { // Noncompliant
    case 1:
      first();
      second();
      break;
    default:
      first();
      second();
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:
      first();
      second();
      break;
    default:
  }

  switch (a) {  // Noncompliant
    case 1:
      first();
      second();
      break;
    case 2:
      first();
      second();
      break;
    default:
      first();
      second();
  }

  switch (a) {  // Noncompliant
    case 1:
      first();
      break;
    case 2:
      first();
      break;
    default:
      first();
  }
}

function conditional_expression() {
  foo(x ? y : z);
  foo(x ? y : y); // Noncompliant {{This conditional operation returns the same value whether the condition is "true" or "false".}}
}
