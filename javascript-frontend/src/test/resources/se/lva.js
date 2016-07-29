function main(p1, p2) {
  var neverRead = null;

  foo(p1); // PS p1=UNKNOWN & p2=UNKNOWN & neverRead=NULL
  if (1) {
    foo(); // PS !p1 & p2=UNKNOWN & !neverRead
  }

  foo(p2);

  p1 = 42; // PS p1=TRUTHY & p2=UNKNOWN & !neverRead

  dummyStatement();

  var x = foo(), y = bar();
  if (condition()) {
    foobar(x); // PS x=UNKNOWN & !y
  } else {
    foobar(y); // PS y=UNKNOWN & !x
  }
}

// GLOBAL SCOPE

var globalNeverRead = null;

foo(unknownGlobal); // PS unknownGlobal=UNKNOWN & globalNeverRead=NULL
if (1) {
  foo(); // PS !unknownGlobal & !globalNeverRead
}

unknownGlobal = 42; // PS unknownGlobal=TRUTHY & !globalNeverRead

dummyStatement();

var x = foo(), y = bar();
if (condition()) {
  foobar(x); // PS x=UNKNOWN & !y
} else {
  foobar(y); // PS y=UNKNOWN & !x
}
