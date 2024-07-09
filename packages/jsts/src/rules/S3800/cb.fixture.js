String.prototype.foo = function() {
  if (this.length == 10)
    return this.substring(5);
  return this;
}

// necessary example to have at least 1 noncompliant case
function foo() { // Noncompliant
    if (condition) {
      return 42;
    }
    return 'str';
  }
