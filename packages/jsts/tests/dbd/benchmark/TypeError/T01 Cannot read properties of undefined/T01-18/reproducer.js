var C = function () {
  this.f = function() {
    this.values.map(() => 42); // Noncompliant: this.values can be null
  }

  this.g = function() {
    this.values = [];
  }
}

var c = new C();
c.f();
