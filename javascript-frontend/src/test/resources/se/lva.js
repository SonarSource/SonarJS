function main(p1, p2) {
  var neverRead = null;

  foo(p1); // PS p1=ANY_VALUE & p2=ANY_VALUE & neverRead=NULL
  if (1) {
    foo(); // PS p1=ANY_VALUE & p2=ANY_VALUE & !neverRead
  }

  foo(p2);

  p1 = 42; // PS p1=POS_NUMBER & p2=ANY_VALUE & !neverRead

  dummyStatement();

  var x = foo(), y = bar();
  if (condition()) {
    foobar(x); // PS x=ANY_VALUE & !y
  } else {
    foobar(y); // PS y=ANY_VALUE & !x
  }

  var k = 42;
  if (cond) {
    foo(); // PS k=POS_NUMBER
    k = 32;
  }
  read(k);
}
