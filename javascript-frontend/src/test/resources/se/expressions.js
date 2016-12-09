function main() {

  var x; // PS x=UNDEFINED
  var y = foo();

  x = !42; // PS x=FALSE
  x = !0; // PS x=TRUE
  x = !unknown; // PS x=BOOLEAN
  if (y) {
    x = !y; // PS x=FALSE
  }

  if (!x) {
    foo(x); // PS x=FALSE
  }

  x = typeof foobar == 'undefined';

  if (x) {
    foo(x); // PS x=TRUE
  }

  x = (y == null);
  if (x) {
    foo(x); // PS x=TRUE
  }

  x = typeof foobar;
  if (x) {
    foo(x); // PS x=TRUTHY_STRING
  }

  x = (foobar == null);
  y = (foobar.foobar == null);
  if (x) {
    if (!y) {
      foo(); // PS x=TRUE & y=FALSE
    }
  }

  foo(x, y);

  x = unknown();
  y = !unknown() in x; // PS y=FALSE
  y = (!unknown()) in x; // PS y=BOOLEAN
  y = true in x; // PS y=BOOLEAN
  y = "str" in x; // PS y=BOOLEAN
  y = (new SomeObj()) in x; // PS y=BOOLEAN
  y = 1 in x; // PS y=BOOLEAN

  foo(x, y);
}
