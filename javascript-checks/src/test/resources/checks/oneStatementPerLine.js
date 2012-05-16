function sayHello() {
  alert("Hello World!"); alert("Hello World!"); // NOK

  if (a) {} // OK

  if (a) {} if (b) {} // NOK

  while (condition); // OK

  label: while (condition) { // OK
    break label; // OK
  }
}
