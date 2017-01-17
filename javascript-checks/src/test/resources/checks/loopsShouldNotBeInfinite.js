/*
for ( ; ; ) {       // Noncompliant {{Add an end condition for this loop}}
}

var a;
var b;
for (;a > b;) {     // OK
    a = true;
}

var c;
for (;c < 1;) {         // Noncompliant {{Correct this loop's end condition}}
    var d = 1;
}

var e;
for(;e === false;) {    // Noncompliant
    var f = e;
}

do {                    // Noncompliant [[secondary=+2]]
    foo();
} while (true);

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

while(true) {           // OK
    return;
}

for(;;) {               // OK Doubly-nested return
    for(;;) {
        return;
    }
}

for(;;) {               // OK
    throw "We are leaving!";
}

while(true) {           // OK Doubly-nested throw
    while(true) {
        throw "We are leaving from deep inside!";
    }
}

var l = 45;
while (l = bar()) {     // OK assignment from function
    boo();
}
*/
{

    while (iterate()) {     // OK return from function
    }

    function iterate() {
    }

}
/*
var m = 100;
for (var n=0; n < m; n--) {     // OK Covered by S2251
    m++;
}

while(false) {          // OK Covered by S2583
}

while(0) {              // OK Covered by S2583
}

{
    var q = 0
    while(q < 3) {          // OK False negative
    }

    function unusedUpdateOutsideCFG() {
        q++;
    }
}

{
    var r = 0
    while(r < 3) {          // OK
        updateOutsideCFG();
    }

    function updateOutsideCFG() {
        r++;
    }
}

{
    var s = 0
    while(s < 3) {          // Noncompliant
        readOutsideCFG();
    }

    function readOutsideCFG() {
        var t = r;
    }
}

{
    var u = {a:3};
    while(u.a < 3) {        // OK U is an object so the function might change it
        doSomethingWithTheArgument(u);
    }
}

var arr;
while(arr[0]--) {                   // OK value is updated in condition
}

var readonlyArr;
while(readonlyArr[0]) {             // OK False Negative
}

var shrinkingArr;
while(shrinkingArr.length) {        // OK
    shrinkingArr.pop();
}

function * generator() {
    while(true) {                   // Noncompliant False POSITIVE!! Needs evolution in CFG to support yield.
        foo();
        yield;
    }
}
*/