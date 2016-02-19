function foo1() {
  foo(arguments);  // Noncompliant {{Use the rest syntax to declare this function's arguments.}}
}

function foo2() {
  foo(arguments);  // Noncompliant [[sc=7;ec=16;el=+0;secondary=+1]]
  foo(arguments[1]);
}

function foo_ok1(a, b) {
  return a + b;
}

function foo_ok2(...args) {
  return args.join(', ');
}

function foo_ok3() {
  console.log("hello!");
}

var arguments = 1;  // OK, global
foo(arguments);
