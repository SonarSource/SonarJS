var a = 1;

function f() {}

a = f(a);

function recursive(p) {
  return recursive(p);
};
