function main(par, unused) {

  var x;   // x=NULL & nested=UNKNOWN & par=UNKNOWN & !unused
  var y = null;  // y=NULL
  var z = foo(y); // z=UNKNOWN & y=NULL

  nested(par, x, y, z);

  function nested() { }

}
