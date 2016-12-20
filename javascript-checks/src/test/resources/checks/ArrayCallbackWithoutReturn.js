function test() {
  var myArray = [1, 2];
  myArray.reduce(function(){}); // Noncompliant {{Add a "return" statement to this callback.}}
//               ^^^^^^^^

  myArray.every(function(){}); // Noncompliant
  myArray.filter(function(){}); // Noncompliant
  myArray.find(function(){}); // Noncompliant
  myArray.findIndex(function(){}); // Noncompliant
  myArray.map(function(){}); // Noncompliant
  myArray.reduce(function(){}); // Noncompliant
  myArray.reduceRight(function(){}); // Noncompliant
  myArray.some(function(){}); // Noncompliant
  myArray.sort(function(){}); // Noncompliant

  myArray.reduce(function(){ return; }); // Noncompliant

  myArray.reduce((a, b) => {foo();}); // Noncompliant
//                      ^^

  myArray.reduce((a, b) => a + b);
  myArray.sort();
  myArray.foobar();
  foo(myArray.reduce);
}

function arrayFrom() {
  Array.from(a);
  Array.from(a, b);
  Array.from(a, function(){}); // Noncompliant
  Array.from(a, function(){}, c); // Noncompliant
  Array.from(a, function(){return 42;});

  Array.isArray(function(){});
  Array.isArray(a, function(){});
}

function several_paths(cond) {
  if (cond) {
    foo();
  }

  var myArray = [1, 2];

  // should raise only one issue
  myArray.reduce(function(){}); // Noncompliant

  foo(cond);
}

function not_function_tree() {
  var myArray = [1, 2];

  myArray.reduce(42);

  var callback = function(){};
  myArray.reduce(callback); // FN
}

var globalArr = [1, 2];
globalArr.reduce(function(){}); // FN, we are limited to the function scope
