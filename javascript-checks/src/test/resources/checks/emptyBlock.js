if (something) {} // Noncompliant {{Either remove or fill this block of code.}}
//             ^^

if (something) { /* empty */ }

if (something) { doSomething(); }

for (var i = 0; i < length; i++) {} // Noncompliant

for (var i = 0; i < length; i++) { /* empty */ }

for (var i = 0; i < length; i++) { doSomething(); }

class Foo {
  foo() {}
  set foo(a) {}
  get foo() {}
}

function foo() {}
function* foo() {}
var myObject = {
  myProperty: function() {},
  myProperty2: function*() {}
}
