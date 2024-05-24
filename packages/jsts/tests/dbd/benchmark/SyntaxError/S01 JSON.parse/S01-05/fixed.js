function foo(bar) {
  bar = JSON.parse(JSON.stringify(bar || {}));
}

foo();
