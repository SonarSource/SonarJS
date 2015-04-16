
//implicit "eval" symbol

var a;
b = 1;

function f (p) {
 // implicit "arguments" symbol
  var a;
  c = 1;  // implicit declaration - global scope
}

try {

} catch (e) {
  var a;
}

