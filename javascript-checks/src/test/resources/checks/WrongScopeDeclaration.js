var count;           // Noncompliant {{Move the declaration of "count" to line 3.}}

function increment(p) {
  count = p;
  return count + 1;
}

function doSomething(a, b) {
  var i;              // Noncompliant {{Move the declaration of "i" to line 10.}}
  if (a > b) {
    i = a;
    console.log(i);
    var x = a - b;    // Noncompliant {{Move the declaration of "x" to line 8.}}
  }

  if (a > 4) {
   console.log(x);
  }

  return a+b;
}

var x;   // Unused should be OK

for (var prop in obj) {
  if (true) {
    console.log(prop);
  }
}