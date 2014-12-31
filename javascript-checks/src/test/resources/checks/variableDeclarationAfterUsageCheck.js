function fun(x) {
  print(x);         // OK
}

print(x);           // NOK
var x = 1;

function fun() {
  print(y);         // NOK
}
var y = 1;

function* fun() {
    print(z);       // NOK
}
var z = 1;

print(a);           // NOK
let a = 1;

print(b);           // NOK
const b = 1;

var f = () => {
    print(c);       // NOK
}

var c;

for (e in es6) {}
var e;
