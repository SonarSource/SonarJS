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
//S ^^^ ID1
    for (bar in MyArray) {     // level 2
//S ^^^ ID1
      while (false) {               // level 3
//S   ^^^^^ ID1 {{Nesting +1}}
        for (foo in MyArray) {         // Noncompliant [[id=ID1]]
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
