let that = this; // Noncompliant
function foo() {
  while (true) {
    return that;
  }
}

function bar() {
  let that = this; // Noncompliant
  while (true) {
    return that;
  }
}

function* baz() {
  let thizz = this; // Noncompliant
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
