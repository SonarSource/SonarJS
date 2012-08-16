function sayHello() {

  ; // +1 empty statement

  if (false) { // +1 if statement
  }

  label: // +1 labelled statement
  for (i = 0; i < 10; i++) { // +1 for statement
    break; // +1 break statement
  }

  return 1; // +1 return statement
}
