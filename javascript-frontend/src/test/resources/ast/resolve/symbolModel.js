// implicit symbols "eval", "undefined", "NaN", "Infinity"

var a;
var a;              // not a new symbol
b = 1;

undefined = 1;      // not a new symbol. Legal, although not recommended
NaN = 1;            // not a new symbol. Legal, although not recommended
undefined = 1;      // not a new symbol. Legal, although not recommended

function f (p1) {
 // implicit "arguments" symbol
  var a;
  c = 1;  // implicit declaration - global scope
  c = undefined;
}

try {

} catch (e) {
  let a;
}

f((p2) => {return a+1}) // implicit "arguments" symbol

for (i of a){}
for (i in a){}

var func;

func(); // function declared below is called

function func() {
  console.log("function call");
}
