function sayHello() {
  if (true) { // level 1
    if (true) { // level 2
    }
  } else if (true) { // level 1
      if (true) { // level 2
      } else      // level 2
          for (; ;)  // level 3
              if (true) {  //level 4
              }
  }

  for (var i = 0; i < 0; i++) { // level 1
    for (bar in MyArray) {     // level 2
      while (false) {               // level 3

        for (foo in MyArray) {         // level 4
        }

        while (false) {                // level 4
        }

        do {                           // level 4
        } while (false);

        switch (foo) {                 // level 4
        }

        try {                          // level 4
        } catch (err) {                // level 4
          if (a) {                        // level 5

          }
        }
      }
    }
  }
}
