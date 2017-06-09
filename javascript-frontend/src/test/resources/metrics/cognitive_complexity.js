function foo() {  // 9
  x && y; // +1

  class ClassInFunction {

    someMethod() {
      if (x) {  // +1

        class ClassInClass {

          innerMethod() {
            if (x) {}  // +3
          }
        }
      }
    }
  }
}

if (x) { // +1

  function bar() {
   x && y;  // +1
   function bar1() {
     if (x) {}  // +2
   }
  }
}


