function sayHello() {
  label: for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
      doSomething();
      if (checkSomething()) {
        continue label;
      }
    }
  }
}
