function f1() {
  var number1 = 1;
  var array1 = [];
  
  number1 - 42;
  array1 - 42; // Noncompliant {{Change that expression so that it doesn't always evaluate to "NaN" (Not a Number).}}
//^^^^^^^^^^^

  42 - array1; // Noncompliant

  array1 / 42; // Noncompliant
  array1 * 42; // Noncompliant
  array1 % 42; // Noncompliant
  
  array1++; // Noncompliant
  array1 = [];
  array1--; // Noncompliant
  array1 = [];
  ++array1; // Noncompliant
  array1 = [];
  --array1; // Noncompliant
  array1 = [];
  
  array1 -= 42; // Noncompliant
  array1 = [];
  array1 *= 42; // Noncompliant
  array1 = [];
  array1 /= 42; // Noncompliant
  array1 = [];
  array1 %= 42; // Noncompliant
  array1 = [];
  
  +array1; // Noncompliant
  -array1; // Noncompliant
  +number1;
  -number1;
  
  var x;
  x = undefined;
  x + 42; // Noncompliant
  42 + x; // Noncompliant
  x + true; // Noncompliant
  x += 42; // Noncompliant
  x + ""; // ok
  x + {}; // ok
  x = null;
  x + 42; // ok
  x = true;
  x + 42; // ok
  
  x = {};
  x - 42; // Noncompliant
  
  var obj1 = {};
  obj1 + 42; // ok
  obj1 += 42; // ok
}

function dates() {
  var date1 = new Date();
  var date2 = new Date();
  +date1; // ok
  date1 - date2; // ok
  date1 / date2; // Noncompliant
  date1 / 42; // Noncompliant
  42 / date1; // Noncompliant
}

function single_issue_per_expression() {
  var x = foo();
  if (typeof x == "function" || typeof x == "undefined") {
    x / 42; // Noncompliant we should have only 1 issue here
  }
}
