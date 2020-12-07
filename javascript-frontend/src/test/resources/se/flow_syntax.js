function main() {
  var x: number = foobar();
  foo(); // PS x=ANY_VALUE
  foo(x);
}
