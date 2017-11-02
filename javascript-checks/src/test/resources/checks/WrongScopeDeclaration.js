var count;           // OK, function "increment" could be called several times

function increment(p) {
  count = p;
  return count + 1;
}

function doSomething(a, b) {
  var i;              // Noncompliant {{Move the declaration of "i" to line 11.}}
  if (a > b) {
    i = a;
    console.log(i);
    var x = a - b;    // Noncompliant {{Move the declaration of "x" to line 9.}}
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

var y;   // OK

function foo(p) {
  if (y) {
    bar(y);
  }
  y = p;
}

for (var j = 1; j < 10; j++) {
  foo(j)
}

var k;    // Noncompliant {{Move the declaration of "k" to line 47.}}
var kk;    // Noncompliant {{Move the declaration of "kk" to line 47.}}
for (k = 1; k < 10; k++) {
  kk = 1;
  foo(kk);
}

function foo() {
  let i; // Noncompliant {{Move the declaration of "i" to line 55.}}

  {
     if (cond) {
        i = 42;
        foo(i);
     } else {
        i = 41;
        foo(i);
     }
  }
}

function bar() {
  let i; // OK

  {
     if (cond) {
        foo(i);
     } else {
        i = 41;
        foo(i);
     }
  }
}

function not_found_cfg_block() {
  let i; // OK

  arr.foreach(function() {
     if (cond) {
       i = 42;
       foo(i);
     }
  });
}

