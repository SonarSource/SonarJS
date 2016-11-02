function f1() {
  42 - 7;
  42 - [1,2]; // Noncompliant {{Change the expression which uses this operand so that it can't evaluate to "NaN" (Not a Number).}}
//     ^^^^^

  [1,2] - 42; // Noncompliant
  [1,2] -  // Noncompliant [[id=1]]
//S     ^ 1
          42;
//S       ^^ 1

  [1,2] / 42; // Noncompliant
  [1,2] * 42; // Noncompliant
  [1,2] % 42; // Noncompliant
  
  42 / [1,2]; // Noncompliant
  42 / unknown; //ok

  var array1 = [1,2];
  array1++; // Noncompliant
//^^^^^^
  var array2 = [1,2];
  array2--; // Noncompliant
  var array3 = [1,2];
  ++array3; // Noncompliant
  var array4 = [1,2];
  --array4; // Noncompliant
  
  var array5 = [1,2];
  array5 -= 42; // Noncompliant
  var array6 = [1,2];
  array6 *= 42; // Noncompliant
  var array7 = [1,2];
  array7 /= 42; // Noncompliant
  var array8 = [1,2];
  array8 %= 42; // Noncompliant
  
  foo(+[1,2]); // Noncompliant
//     ^^^^^
  foo(-[1,2]); // Noncompliant
  foo(+42);
  foo(-42);
  
  undefined + 42; // Noncompliant
  42 + undefined; // Noncompliant
  undefined + true; // Noncompliant
  var x = undefined;
  x += 42; // Noncompliant
  
  undefined + ""; // ok
  undefined + {}; // ok
  undefined + undefined; // Noncompliant

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
  date1 / date2; // ok
  new Date() / 42; // ok
  42 / new Date(); // ok
}

function primitive_wrappers() {
  var array1 = [1,2];
  var number1 = new Number(42);
  var boolean1 = new Boolean(true);
  array1 + number1; // ok, concatenation
  undefined + number1; // Noncompliant
  undefined + boolean1; // Noncompliant
  undefined + ""; // ok
  array1 / number1; // Noncompliant
  +number1; // ok
  +boolean1; // ok
  number1 / 2; // ok
}

function single_issue_per_expression() {
  var x = "";
  if (condition) {
    x = 42;
  }
  x.y / 42; // Noncompliant we should have only 1 issue here
}

function single_issue_per_symbol() {
  var x = [1, 2];
  x / 42; // Noncompliant
  x - 42; // ok, an issue was already raised on the value of x
}
