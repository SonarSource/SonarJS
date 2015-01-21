// NOK
if (something) {
}

// OK
if (something) {
  // empty
}

// OK
if (something) {
  doSomething();
}

// NOK
for (var i = 0; i < length; i++) {
}

// OK
for (var i = 0; i < length; i++) {
  // empty
}

// OK
for (var i = 0; i < length; i++) {
  doSomething();
}

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
