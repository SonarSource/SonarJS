String.prototype.foo = function() {
  if (this.length == 10)
    return this.substring(5);
  return this;
}

// necessary example to have at least 1 noncompliant case
function foo() { // Noncompliant {{Refactor this function to always return the same type.}}
    if (condition) {
      return 42;
    //^^^^^^^^^^< {{Returns number}}
    }
    return 'str';
  //^^^^^^^^^^^^^< {{Returns string}}
  }
