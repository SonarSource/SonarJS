function main(p) {

  bar();  // PS p=UNKNOWN

  if (p.foo) { // as property of "p" is accessed we can be sure it's not null
    bar(); // PS p=NOT_NULLY
  } else {
    bar(); // PS p=NOT_NULLY
  }

  bar(); // PS p=NOT_NULLY

  if (p.foo.bar) {
    var x;
    if (p.foo != null) {  // always true, but we can't that infer yet
      x = null;
    } else {
      x = 42;
    }

    dummyStatement();  // PS x=NULL || x=TRUTHY_NUMBER
    makeLive(x);
  }

  if (unknown.foo) {
      var y;
      if (unknown.foo != null) {  // always true, but we can't that infer as unknown is not declared
        y = null;
      } else {
        y = 42;
      }

      dummyStatement();  // PS y=NULL || y=TRUTHY_NUMBER
      makeLive(y);
  }

}
