
function compliant(par) {
  var obj = {a:1, b:2};
  var prop = 'a';
  delete obj.a;
  delete obj['a'];
  delete obj[prop];
  delete (obj.a);

  var arr = [1, 2, 3]
  var index = 1;
  delete arr[1];
  delete arr[index];

  delete par.a;
  delete foo().bar().a;
  delete foo().bar()[foo];

  // variable declared without var becomes deletable property of global object
  globalProperty = 5;
  delete globalProperty;
}


function noncompliant(par) {
  var var1 = 1;
  delete var1; // Noncompliant {{Remove this "delete" operator or pass an object property to it.}}

  delete foo().bar(); // Noncompliant
  delete var1 + 4;    // Noncompliant

  var var2 = {a : 1};
  delete var2; // Noncompliant
}

// TEST GLOBAL SCOPE

// variable declared without var becomes deletable property of global object
anotherGlobalProperty = 5;
delete anotherGlobalProperty;  // Compliant

// global variable declared with var becomes non-deletable property of global object
var x = 1;
delete x;  // Noncompliant

globalObj = {a : 1};
function foo() {  return globalObj.a;  }
delete globalObj.a;  // Compliant
delete foo(globalObj); // Noncompliant
delete globalObj;    // Compliant
delete foo; // Noncompliant

var foo1 = function() {}
delete foo1; // Noncompliant

foo2 = function() {}
delete foo2; // Compliant
