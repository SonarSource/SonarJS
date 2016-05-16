function main(par, unused) {

  class MyClass { }

  var x;   // PS x=NULL & nested=UNKNOWN & par=UNKNOWN & !unused & MyClass=UNKNOWN
  var y = null;  // PS y=NULL
  var z = foo(y); // PS z=UNKNOWN & y=NULL

  nested(par, x, y, z);
  var obj = new MyClass();

  function nested() { }

}
