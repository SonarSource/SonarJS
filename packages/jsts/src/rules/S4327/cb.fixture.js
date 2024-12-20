let that = this; // Noncompliant {{Unexpected aliasing of 'this' to local variable.}}
function foo() {
  while (true) {
    return that;
  }
}

function bar() {
  let that = this; // Noncompliant {{Unexpected aliasing of 'this' to local variable.}}
  while (true) {
    return that;
  }
}

function* baz() {
  let thizz = this; // Noncompliant {{Unexpected aliasing of 'this' to local variable.}}
  while (true) {
    yield thizz;
  }
}

let self = this; // OK
function* qux() {
  while (true) {
    yield self;
  }
}

let thiz = this; // OK
(function* () {
  while (true) {
    yield thiz;
  }
});
