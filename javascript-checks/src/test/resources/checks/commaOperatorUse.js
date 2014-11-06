i = a += 2, a + b;                        // NOK

for (var i = 0; i < a, i< b; i++)         // NOK
{}

while(a, b) {}                            // NOK

switch(a, b) {                            // NOK
  case 0, 1:                              // NOK
    break;
}

if (a, b)                                 // NOK
{}

for (a in myArray1, myArray2)             // NOK
{}

var i = (a, b)                            // NOK

a = 1, b =2;                              // NOK
(a = 1, b =2);                            // NOK
a = (b = 1, c = 1);                       // NOK

doSomething(), a = 1;                     // NOK

doSomething(a)[b, c];                     // NOK

a = f1(b),                                // NOK
    f2(c),
    f3(d);

x = a ? b : (doSOmething(), b = c);       // NOK

switch(a) {
  case 0:                                 // OK
    break;
}

doSomething(a, b);                        // OK

for (i = 0, j = 0; i < a; i++, j++)       // OK
{}

var myArray = [1, 2, 3];                  // OK
var myObject = {a:1, b:2, c:3};           // OK
var a = 1, b = 1;                         // OK

doSomething((p1, p2) => p1 + p2);         // OK
