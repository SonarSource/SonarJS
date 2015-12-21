function sayHello() {

  if (condition) doSomething(); // Noncompliant {{Add curly braces around the nested statement(s) in this "if" block.}}

  for (i = 0; i < 10; i++) doSomething(); // Noncompliant {{Add curly braces around the nested statement(s) in this "for" block.}}

  while (condition) doSomething(); // Noncompliant {{Add curly braces around the nested statement(s) in this "while" block.}}

  do something(); while (condition); // Noncompliant {{Add curly braces around the nested statement(s) in this "do" block.}}

  if (condition) { // OK
  }

  if (condition) { // OK
  } else doSomething(); // Noncompliant {{Add curly braces around the nested statement(s) in this "else" block.}}

  if (condition) { // OK
  } else if (condition) { // OK
  }

  if (condition) // Noncompliant
    if (condition) {
    }

  for (i = 0; i < 10; i++) { // OK
  }

  while (condition) { // OK
  }

  do { // OK
    something();
  } while (condition);

  for(var p in a)  something()  // Noncompliant

}
