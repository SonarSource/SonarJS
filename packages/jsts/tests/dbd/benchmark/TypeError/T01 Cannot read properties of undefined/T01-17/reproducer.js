var C = function () {
  this.f = function() {
    this.values.forEach(() => { // Noncompliant: this.values can be undefined
      42;
    });
  }

  this.g = function() {
    this.values = [];
  }
}

var c = new C();
c.f();

