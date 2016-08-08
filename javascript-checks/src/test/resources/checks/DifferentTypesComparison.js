function foo() {
  var str = "1";
  var num = 1;
  var bool = true;

  var expr;

  expr = str === num; // Noncompliant {{Remove this "===" check; it will always be false. Did you mean to use "=="?}}
  expr = str === 1;   // Noncompliant [[sc=14;ec=17;secondary=+0,+0]]
  expr = bool === str; // Noncompliant
  expr = bool !== str; // Noncompliant {{Remove this "!==" check; it will always be false. Did you mean to use "!="?}}

  expr = bool == str;
  expr = bool != str;
  expr = str === "str";
  expr = foo() === str; // no info about foo() return type



  var obj1 = {};
  var obj2 = window;
  var obj3 = $("div");
  expr = str === obj1; // Noncompliant
  expr = obj1 === obj2; // Compliant
  expr = obj1 === obj3; // Compliant
  expr = obj2 === obj3; // Compliant
}

function severalExecutionPath() {
  var str = "1";

  if (condition) {
    str = 1;
  }

  expr = str === 1; // OK

  var a, b;

  if (condition) {
    a = 1;
    b = "str";
  } else {
    a = true;
    b = null;
  }

  expr = a === b; // Noncompliant
}

function typeSet(p1, p2) {
  var x = foo()
  var y = a > b;
  typeof x == "object" && x === y; // Noncompliant
}
