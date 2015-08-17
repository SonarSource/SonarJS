var a = 1;

function f() {}

a = f(a);

function recursive(p) {
  return recursive(p);
};

var c = 2;
c = 1
var c = 1;  // should be highlighted
c = 2