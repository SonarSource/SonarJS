// TESTS USING "new"

function foo1(a) {                                         // OK
  console.log(a);
}

var foo2 = new Object();                                   // OK

var foo3 = new FuncTion();                                 // OK

var foo4 = new Function;                                   // OK  (no argument list)

var foo5 = new Function();                                 // OK  (empty argument list)

var bar1 = new Function('a', 'console.log(a);');           // Noncompliant {{Simply declare this function instead.}}
//         ^^^^^^^^^^^^

bar2 = new Function('b', 'console.log(b);');               // Noncompliant
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
  return Function('return "hello";');                      // Noncompliant {{Simply declare this function instead.}}
//       ^^^^^^^^
}

var bar1 = Function('a', 'console.log(a);');               // Noncompliant
//         ^^^^^^^^

bar2 = Function('a', 'console.log(a);');                   // Noncompliant
