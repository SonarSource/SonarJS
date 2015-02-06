if (a = 1) {                              // NOK
}

if (a == 1, b = 2) {                      // NOK
}

if (a == 1) {                              // OK
}

if ((value = someFunction()) === true) {  // OK
}

if ((value = someFunction()) > val) {     // OK
}

while (a = 1) {                           // OK
}

while (a == 1) {                          // OK
}

do {
} while (a = 1)                           // OK

do {
} while (a == 1)                          // OK

for (i = 0; i = 10; i += 2) {             // NOK
}

for (i = 0; (i = 10) > a; i += 2) {       // OK
}

for (i = 0; (i = 10) === a; i += 2) {     // OK
}

for (i = 0; i < 10; i += 2) {             // OK
}

for (i = 0; ; i++) {                      // OK
}

a = 0, b = 1, c = 2;                      // OK

a = b;                                    // OK

a = (b = c),  1;                          // NOK

a = (b = c) === 1;                        // OK - relation expression

while((a = b) != null) {                  // OK
}

for (i = 0, j = 0, k = 0; i < x; i++);    // OK

for (i = (a = 0), j = 0, k = 0; i < x; i++);    // NOK

var a = b = c = 1;                        // OK

var arr = [a = 1]                         // NOK
