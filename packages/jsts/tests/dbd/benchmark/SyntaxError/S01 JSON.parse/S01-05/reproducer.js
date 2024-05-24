function foo(bar) {
  bar = JSON.parse(JSON.stringify(bar)); // Noncompliant: if bar === undefined
}

foo();
