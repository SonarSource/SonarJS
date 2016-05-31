function sayHello() {
  if (true) { // level 1
    if (true) { // level 2
    }
  } else if (true) { // level 1
      if (true) { // level 2
      } else      // level 2
          for (; ;)  // level 3
              if (true) {  // Noncompliant {{Refactor this code to not nest more than 3 if/for/while/switch/try statements.}}
//            ^^
              }
  }

  for (var i = 0; i < 0; i++) { // level 1
    for (bar in MyArray) {     // level 2
      while (false) {               // level 3

        for (foo in MyArray) {         // Noncompliant [[secondary=-4,-3,-2]]
        }

        while (false) {                // Noncompliant
        }

        do {                           // Noncompliant
        } while (false);

        switch (foo) {                 // Noncompliant
        }

        try {                          // Noncompliant
        } catch (err) {                // level 4
          if (a) {                        // level 5

          }
        }
      }
    }
  }
}
