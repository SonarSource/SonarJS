function if_statement() {
  if (a) {
    first();
    second();
  } else if (b) {
    foo();
  } else {                 // Noncompliant {{Either merge this branch with the identical one on line "2" or change one of the implementations.}}
    first();
    second();
  }

  if (a) {
    first();
    second();
  } else if (a) {          // Noncompliant [[sc=17;el=+3;ec=4;secondary=-3]]
    first();
    second();
  }

  if (a) {
    first();
    second();
  } else if (a) {
    second();
  } else if (a) {          // Noncompliant
    first();
    second();
  }

  if (a) {
    first();
    second();
  } else if (a) {          // Noncompliant
    first();
    second();
  } else if (a) {
    second();
  }

  if (a) {
    first();
  } else if (a) {          // OK, just one line
    first();
  }

  if (a)
    doSomething(function() {
    });
  else if (a)
    doSomething(function() {         // Noncompliant
    });


  // OK, case when all branches are are same should be covered by another rule
  if (a) {
    first();
    second();
  } else {
    first();
    second();
  }

  if (a) {
    first();
    second();
  } else if (b) {
    first();
    second();
  }else {
    first();
    second();
  }

  if (a) {              // OK, just a single if, no problem with it.
    foo();
    bar();
  }


  if (a) {
    first();
    second();
  } else if (a) {      // Noncompliant
    first();
    second();
  } else if (a) {      // Noncompliant
    first();
    second();
  }

  if (a) {
    first();
  } else if (b) {
    first();
    second();
  } else {                 // Noncompliant
    first();
    second();
  }
}



function switch_statement() {

  switch (a) {
    case 1:
      first();
      break;
    case 2:                // OK, just one line
      first();
      break;
    case 3:
      second();
      break;
    default:
      first();             // OK, just one line
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:
    case 3:               // Noncompliant
      first();
      second();
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 3:               // Noncompliant
      first();
      second();
      break;
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:
      first();
      break;
    default:               // Noncompliant {{Either merge this case with the identical one on line "143" or change one of the implementations.}}
      first();
      second();
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:                // Noncompliant [[sc=5;el=+3;ec=13;secondary=-4]]
      first();
      second();
      break;
    default:
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:
      second();
      break;
    default:               // Noncompliant
      first();
      second();
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:                // Noncompliant
      first();
      second();
      break;
    case 3:
      second();
      break;
    default:
  }

  switch (a) {
    case 1:
      first();
      second();
      break;
    case 2:
      second();
      break;
    case 3:                // Noncompliant
      first();
      second();
      break;
    default:
  }

  switch (a) {
    case 1:
      first();
      // fall through
    case 2:
      second();
      break;
    case 3:                // OK
      first();
      break;
    default:
  }

  switch (a) {  // OK, all branches identical
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
}


function conditional_expression() {
  foo(x ? y : y); // OK, covered by another rule S3923
}
