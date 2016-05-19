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

var jsxElement = <div>{c * 3}</div>;

var {x, y} = obj;
