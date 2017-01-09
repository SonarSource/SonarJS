/*
*/
for ( ; ; ) {       // Noncompliant {{Add an end condition for this loop}}
//    ^^^
}

for (;;) {          // Noncompliant {{Add an end condition for this loop}}
//   ^^
}

var a;
var b;
for (;a > b;) {     // OK
 a = true;
}


var c;
for (;c < 1;) {     // Noncompliant {{Correct this loop's end condition}}
//    ^^^^^
 var d = 1;
}

var e;
for(;e === false;) {    // Noncompliant
    var f = e;
}

while(true) {           // OK
    foo();
    if(g) {
        break;
    }
}


outer:
while(true) {           // Noncompliant
    foo();
    while(true) {
        break;
    }
}

outer:
while(true) {           // OK
    foo();
    while(true) {
        break outer;
    }
}

outer:
  for(;;) {             // OK
    foo();
    while(true) {
        break outer;
    }
  }

while(true) {           // Noncompliant
  foo();
}

var h;
while(h) {              // OK
  h = false;
}

var i = -2;
while(i < 0) {
    for(;;) {           // Noncompliant
        i++;
    }
}

for(;;) {               // OK
    for(;;) {
        return 0;
    }
}

for(;;) {               // OK
    throw "We are leaving!";
}

while(true) {           // OK
    while(true) {
        return;
    }
}

while(true) {           // OK
    while(true) {
        throw new String("Some Object");
    }
}

function someFunction() {
    while(true) {           // OK
        var a = false;
        if(a) {
            someFunction();
        } else {
            return "ok";
        }
    }
}


do {
    foo();
} while (true);         // Noncompliant

var j=0,k=3;
for (; j > 10 ; j++) {  // OK
    foo();
}

var l = 45;
while (l = bar()) {      // OK
    boo();
}

var m = 100;
for (var n=0; n < m; n--) {     // OK False negative
    m++;
}

var o = 5;
while (o < 10) {        // OK False negative
    o = o % 5;
}

while(false) {          // Noncompliant In fact this should be detected by a dead code check.
}

var q = 0
while(q < 3) {          // OK False negative
}

function update() {
    q++;
}

var r = 0
while(r < 3) {          // OK
    updateAndUse();
}

function updateAndUse() {
    r++;
}

var arr;
while(arr[0]--) {               // OK
}

var shrinkingArr;
while(shrinkingArr.length) {           // OK
    shrinkingArr.pop();
}

function * generator() {
    while(true) {               // Noncompliant False POSITIVE!! Needs evolution in CFG to support yield.
        foo();
        yield;
    }
}
/*
*/