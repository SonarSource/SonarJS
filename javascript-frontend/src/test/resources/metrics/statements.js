function sayHello() {

  ; // +1 empty statement

  var a = 0; // +1 variable statement
  a = a + 1; // +1 expression statement

  if (false) // +1 if statement
  { // +0 compound statement
    throw new Exception(); // +1 throw statement
  }

  label: // +0 labelled statement
  for (i = 0; i < 10; i++) // +1 for statement
  { // +0 compound statement
    break; // +1 break statement
  }

  while (false) // +1 while statement
  { // +0 compound statement
    continue; // +1 continue statement
  }

  do // +1 do-while statement
  { // +0 compound statement
  } while (false);

  for (a in b) // +1 for-in statement
  { // +0 compound statement
  }

  with (a) // +1 with statement
  { // +0 compound statement
  }

  switch (param) { // +1 switch statement
    case 0:
    case 1:
    default:
  }

  try { // +1 try statement
  } catch (e) {
  } finally {
  }

  debugger; // +1 debugger statement

  return 1; // +1 return statement
}
