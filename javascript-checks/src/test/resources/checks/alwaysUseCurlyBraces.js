function sayHello() {

  if (condition) doSomething(); // NOK

  for (i = 0; i < 10; i++) doSomething(); // NOK

  while (condition) doSomething(); // NOK

  do something(); while (condition); // NOK

  if (condition) { // OK
  }

  if (condition) { // OK
  } else doSomething(); // NOK

  if (condition) { // OK
  } else if (condition) { // OK
  }

  if (condition) // NOK
    if (condition) {
    }

  for (i = 0; i < 10; i++) { // OK
  }

  while (condition) { // OK
  }

  do { // OK
    something();
  } while (condition);

  for(var p in a)  something()

}
