
var z = 1 // OK - global

function foo(){

  var x = 1  // OK - declaration

  var y = 2  // OK - declaration
  y = 3   // NOK
  y = 4   // NOK

  t = 1 // OK - global
}

function fooo(p){} // OK