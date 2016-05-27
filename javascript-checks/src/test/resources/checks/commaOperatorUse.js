i = a += 2, a + b;                        // Noncompliant {{Remove use of this comma operator.}}
//        ^

for (var i = 0; i < a, i< b; i++)         // Noncompliant
{}

while(a, b) {}                            // Noncompliant

switch(a, b) {                            // Noncompliant
  case 0, 1:                              // Noncompliant
    break;
}

if (a, b)                                 // Noncompliant
{}

for (a in myArray1, myArray2)             // Noncompliant
{}

var i = (a, b)                            // Noncompliant

a = 1, b =2;                              // Noncompliant
(a = 1, b =2);                            // Noncompliant
a = (b = 1, c = 1);                       // Noncompliant

doSomething(), a = 1;                     // Noncompliant

doSomething(a)[b, c];                     // Noncompliant

a = f1(b),                                // Noncompliant [[secondary=+2,+3]] {{Remove use of all comma operators in this expression.}}
//       ^
    f2(c),
    f3(d),
    f4();

x = a ? b : (doSOmething(), b = c);       // Noncompliant

switch(a) {
  case 0:                                 // OK
    break;
}

doSomething(a, b);                        // OK

for (i = 0, j = 0, k = 0; i < a; i++, j++)       // OK
{}

var myArray = [1, 2, 3];                  // OK
var myObject = {a:1, b:2, c:3};           // OK
var a = 1, b = 1;                         // OK

doSomething((p1, p2) => p1 + p2);         // OK

for (i = (0, 1), j = 0; i < a; i++, j++)       // Noncompliant
{}

var x, y = 2; // ok

(foo(x, y), point)                      // Noncompliant
   || (foo(x, y), point) || foo(x, y);  // Noncompliant

x = function(){
  }, 2                                    // Noncompliant
