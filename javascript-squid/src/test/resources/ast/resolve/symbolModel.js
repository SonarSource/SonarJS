
//implicit "eval" symbol

var a;
b = 1;

function f (p1) {
 // implicit "arguments" symbol
  var a;
  c = 1;  // implicit declaration - global scope
}

try {

} catch (e) {
  var a;
}

f((p2) => {return a+1}) // implicit "arguments" symbol

for (var i of a){}
for (var i in a){}
