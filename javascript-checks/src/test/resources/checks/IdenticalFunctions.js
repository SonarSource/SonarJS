// NOK basic case
function foo() {
//S      ^^^ ID1 {{original implementation}}
  console.log("Hello");
  console.log("World");
  return 42;
}

  function bar() { // Noncompliant [[ID=ID1]] {{Update this function so that its implementation is not identical to the one on line 2.}}
//         ^^^

  console.log("Hello");
  console.log("World");

  return 42;
}

// NOK different kinds of functions
let funcExpression = function () { // Noncompliant
//                   ^^^^^^^^
  console.log("Hello");
  console.log("World");
  return 42;
}

let arrowFunction = () => { // Noncompliant
//                     ^^
  console.log("Hello");
  console.log("World");
  return 42;
}

class A {
  sameAsConstructor() {
    console.log("Hello");
    console.log("World");
    console.log("!");
  }

  constructor() { // Noncompliant
//^^^^^^^^^^^
    console.log("Hello");
    console.log("World");
    console.log("!");
  }

  method() { // Noncompliant
//^^^^^^
    console.log("Hello");
    console.log("World");
    return 42;
  }

  set setter(p) { // Noncompliant
//    ^^^^^^
    console.log("Hello");
    console.log("World");
    return 42;
  }

  get getter() {// Noncompliant
//    ^^^^^^
    console.log("Hello");
    console.log("World");
    return 42;
  }
}


// NOK single statement but many lines
function foo1() {
  return [
    1,
  ];
}

  function bar1() { // Noncompliant
//         ^^^^
  return [
    1,
  ];
}

// OK 2 lines
function foo2() {
  console.log("Hello");
  return 42;
}

function bar3() {
  console.log("Hello");
  return 42;
}
