function sayHello() {

  ; // +1 empty statement

  var a = 0; // +1 variable statement
  a = a + 1; // +1 expression statement

  if (false) // +1 if statement
  { // +0 compound statement
  }

  label: // +0 labelled statement
  for (i = 0; i < 10; i++) // +1 for statement
  { // +0 compound statement
    break; // +1 break statement
  }

  debugger; // +1 debugger statement

  return 1; // +1 return statement
}
