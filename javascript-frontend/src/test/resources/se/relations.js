function main() {

  var a = foo();
  var b = bar();
  
  if (a > b) {
    let x = null;

    if (a < b) { // always false
      x = 0;
    }
    foo(x); // PS x=NULL
    
    if (a >= b) { // always true
      x = 0;
    }
    foo(x); // PS x=ZERO

    x = null
    if (a == b) {
      x = 0;
    }
    foo(x); // PS x=NULL
    
    x = null
    if (a === b) {
      x = 0;
    }
    foo(x); // PS x=NULL

  }
  
  if (a > unknown1) {
    let x2 = null;
    if (a > unknown2) {
      x2 = 0;
    }
    foo(x2); // PS x2=ZERO || x2=NULL
  }

}
