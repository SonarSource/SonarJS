function f1() {
  42 - 7;
  42 - []; // Noncompliant {{Change the expression using this operand so that it can't evaluate to "NaN" (Not a Number).}}
//     ^^

  [] - 42; // Noncompliant
  [] -  // Noncompliant [[id=1]]
//S  ^ 1
       42;
//S    ^^ 1

  [] / 42; // Noncompliant
  [] * 42; // Noncompliant
  [] % 42; // Noncompliant

  var array1 = [];
  array1++; // Noncompliant
//^^^^^^
  var array2 = [];
  array2--; // Noncompliant
  var array3 = [];
  ++array3; // Noncompliant
  var array4 = [];
  --array4; // Noncompliant
  
  var array5 = [];
  array5 -= 42; // Noncompliant
  var array6 = [];
  array6 *= 42; // Noncompliant
  var array7 = [];
  array7 /= 42; // Noncompliant
  var array8 = [];
  array8 %= 42; // Noncompliant
  
  foo(+[]); // Noncompliant
//     ^^
  foo(-[]); // Noncompliant
  foo(+42);
  foo(-42);
  
  undefined + 42; // Noncompliant
  42 + undefined; // Noncompliant
  undefined + true; // Noncompliant
  var x = undefined;
  x += 42; // Noncompliant
  
  undefined + ""; // ok
  undefined + {}; // ok

  null + 42; // ok
  true + 42; // ok
  
  var obj1 = {}
  obj1 - 42; // Noncompliant
  var obj2 = {}
  obj2 + 42; // ok
  var obj3 = {};
  obj3 += 42; // ok
}

function dates() {
  var date1 = new Date();
  var date2 = new Date();
  +date1; // ok
  date1 - date2; // ok
  date1 / date2; // Noncompliant
  new Date() / 42; // Noncompliant
  42 / new Date(); // Noncompliant
}

function single_issue_per_expression() {
  var x, y;
  x / y; // Noncompliant we should have only 1 issue here
}

function single_issue_per_symbol() {
  var x = [1, 2];
  x / 42; // Noncompliant
  x - 42; // ok, an issue was already raised on the value of x
}
