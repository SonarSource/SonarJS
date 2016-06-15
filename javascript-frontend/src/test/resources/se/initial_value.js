function main(par, unused) {

  class MyClass { }

  var x;   // PS x=UNDEFINED & nested=UNKNOWN & par=UNKNOWN & !unused & MyClass=UNKNOWN
  var y = null;  // PS y=NULL
  var z = foo(y); // PS z=UNKNOWN & y=NULL

  let {x1, x2} = foo(); // PS !x1 & !x2
  dummyStatement();
  
  nested(par, x, y, z);
  var obj = new MyClass();

  function nested() { }

}
