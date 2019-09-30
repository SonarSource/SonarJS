function fun(x) {
  print(x);         // OK
}

print(x);           // Noncompliant {{Move the declaration of "x" before this usage.}}
var x = 1;

function fun() {
  print(y);         // Noncompliant [[sc=9;ec=10;el=+0]]
}
var y = 1;

function* fun() {
    print(z);       // Noncompliant [[secondary=+2]]
}
var z = 1;

print(a);           // OK, ReferenceError
let a = 1;

print(b);           // OK, ReferenceError
const b = 1;

var f = () => {
    print(c);       // Noncompliant
}

var c;

for (var f in es6) {}
var f;

for (e in es6) {}   // Noncompliant
var e;
