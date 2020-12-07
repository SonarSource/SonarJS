function main(par, unused) {

  class MyClass { }

  var x;   // PS x=UNDEFINED & nested=FUNCTION & par=ANY_VALUE & !unused & MyClass=OTHER_OBJECT
  var y = null;  // PS y=NULL
  var z = foo(y); // PS z=ANY_VALUE & y=NULL

  let {x1, x2} = foo(); // PS x1=ANY_VALUE & x2=ANY_VALUE
  dummyStatement();
  
  nested(par, x, y, z);
  var obj = new MyClass();

  function nested() { }


  var [element1=1, element2] = arr;
  if (element1 && element2 == null) {
    foo(); // PS element1=TRUTHY & element2=NULLY
  }

  makeLive(element1, element2);

  var str = `string template`;
  foo(); // PS str=STRING

}
