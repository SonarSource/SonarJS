// TESTS USING "new"

function foo1(a) {                                         // OK
  console.log(a);
}

var foo2 = new Object();                                   // OK

var foo3 = new FuncTion();                                 // OK (wrong spelling, but anyway has no arguments)

var foo4 = new FuncTion('a', 'console.log(a);');           // OK (wrong spelling)

var foo5 = new Function;                                   // OK  (no argument list)

var foo6 = new Function();                                 // OK  (empty argument list)

bar2 = new Function('b', 'console.log(b);');               // Noncompliant {{Declare this function instead of using the "Function" constructor.}}
//     ^^^^^^^^^^^^

function bar3(a) {
  var bar4 = new Function('c', 'console.log(c);');         // Noncompliant
  return bar5(a);
}

var bar6 = bar7(a, new Function('d', 'console.log(d);'));  // Noncompliant
//                 ^^^^^^^^^^^^

function bar8(a) {
  return new Function(a);                                  // Noncompliant
}

function Person(name) {
  this.name = name;
  this.desc1 = function() {
    return name;
  }
  this.desc2 = new Function('return name;');               // Noncompliant
}


// TESTS NOT USING "new"

function baz1() {
  return Function;                                         // OK
}

function baz2() {
  return Function();                                       // OK
}

function baz3() {
  return Function('return "hello";');                      // Noncompliant {{Declare this function instead of using the "Function" constructor.}}
//       ^^^^^^^^
}

var bar1 = Function('a', 'console.log(a);');               // Noncompliant
//         ^^^^^^^^

bar2 = Function('a', 'console.log(a);');                   // Noncompliant
