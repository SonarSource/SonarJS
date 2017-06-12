function foo() {  // 23
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

// Increasing coverage for frontend module, but what follows is already covered in checks module
foo(1 && 2 && 3 && 4); // +1

foo((1 && 2) && (3 && 4)); // +1

while (condition) {             // +1
}

do {                            // +1
} while (condition)

for (i = 0; i < length; i++) {  // +1
  continue;
}

for (x in obj) {                // +1
}

for (x of obj) {                // +1
}

switch (expr) {                // +1
   case "1":
      break;
   default:
      foo();
}

if (x) {    // +1
} else if (y) {   // +1
} else {}   // +1

let funcExpr = function() {}

let arrow = (x) => x * 2;

x ? true : false  // +1

try {
  foo();
} catch (someError) {   // +1
}

class TopLevelClass {

  a = 0;

  foo() {}

  get accessor() {
    return a && true;   // +1
  }

}
