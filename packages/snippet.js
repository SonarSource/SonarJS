foo('baz');

function foo(token) {
  if (token) {
    return bar(token.value); // Noncompliant (or line 8)
  }
}

function bar(value) {
  if (value.name) {
  }
}
