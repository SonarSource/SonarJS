  function test1() { // Noncompliant [[id=test1]] {{Refactor this function to always return the same type.}}
//^^^^^^^^
  if (condition) {
    return 42;
//S ^^^^^^ test1 {{Returns Number}}
  }

    return "str";
//S ^^^^^^ test1 {{Returns String}}
}

function test2() { // OK, don't consider case when no return
  if (condition) {
    return 42;
  }
}

function test3() { // OK, one return without value
  if (condition) {
    return 42;
  } else {
    return;
  }
}

function test4() { // OK, same type
  if (condition) {
    return 42;
  } else {
    return 0;
  }
}

function test5() { // OK, one return type is unknown
  if (condition) {
    return 42;
  } else {
    return foo.bar();
  }
}



function test6() { // Noncompliant [[id=test6]], even if one return type is unknown, we raise issue
  if (condition1) {
    return {a:1};
//S ^^^^^^ test6 {{Returns Object}}

  } else if (condition2){
    return foo.bar(); // unknown type

  } else if (condition3) {
    return function(){};
//S ^^^^^^ test6 {{Returns Function}}

  } else if (condition4) {
    return [1, 2];
//S ^^^^^^ test6 {{Returns Array}}

  } else if (condition5) {
    return new Date();
//S ^^^^^^ test6 {{Returns Date}}

  } else {
    return new RegExp();
//S ^^^^^^ test6 {{Returns RegExp}}
  }
}

function test7() { // OK, "null" and "undefined" match any type
  if (condition1) {
    return null;

  } else if (condition2){
    return 42;

  } else {
    return undefined;
  }
}

function test8() { // OK, empty
}

class A {
  test9() { // Noncompliant
//^^^^^
    if (condition) {
      return 1;
    } else {
      return "2";
    }
  }
}

function test10() { // Noncompliant [[id=test10]]
    return condition ? 1 : "str";
//S ^^^^^^ test10 {{Returns Number or String}}
}

function test11() { // Noncompliant [[id=test11]]
  var x;
  if (condition) {
    x = 1;
  } else {
    x = "2";
  }

    return x;
//S ^^^^^^ test11 {{Returns Number or String}}
}
