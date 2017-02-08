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

function not_function_tree_as_argument() {
  var myArray = [1, 2];

  myArray.reduce(42);

  var callback = function(){};
//S              ^^^^^^^^ ID1 {{Callback declaration}}
  myArray.reduce(callback); // Noncompliant [[id=ID1]] {{Add a "return" statement to this callback.}}
//               ^^^^^^^^

  function callbackDeclaration() {}
//S        ^^^^^^^^^^^^^^^^^^^ ID2
  myArray.reduce(callbackDeclaration); // Noncompliant [[id=ID2]]

  var identifierWithoutFunction = 42;
  myArray.reduce(identifierWithoutFunction); // Ok

  myArray.reduce(foo().bar()); // Ok
}

var globalArr = [1, 2];
globalArr.reduce(function(){}); // FN, we are limited to the function scope
