function fun() {
  x = 1; // Noncompliant {{Add the "let", "const" or "var" keyword to this declaration of "x" to make it explicit.}}
//^
  x = 2;
  var y = 3; // OK
}

for (z in obj){}  // Noncompliant

for (j = 0; j < array.length; j++){} // Noncompliant

for (k of obj){}  // Noncompliant

function fun(){
  z = 1;   // OK
  var z;
  var var1 = var2 = 1;  // Noncompliant {{Add the "let", "const" or "var" keyword to this declaration of "var2" to make it explicit.}}
  fun(arguments) // OK
}

let unflowed;
unflowed = false;

let flowed: boolean;
flowed = true;

// Node.js-related exclusions
var foo = exports = module.exports = {} // OK
module = 1; // OK
