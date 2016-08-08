function main(par, unused) {

  class MyClass { }

  var x;   // PS x=UNDEFINED & nested=FUNCTION & par=ANY_VALUE & !unused & MyClass=OTHER_OBJECT
  var y = null;  // PS y=NULL
  var z = foo(y); // PS z=ANY_VALUE & y=NULL

  let {x1, x2} = foo(); // PS !x1 & !x2
  dummyStatement();
  
  nested(par, x, y, z);
  var obj = new MyClass();

  function nested() { }

}
