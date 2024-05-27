var C = function () {

  this.values = [];

  this.f = function() {
    this.values.map(() => 42); // Noncompliant
  }

  this.g = function() {
    this.values = [];
  }
}

var c = new C();
c.f();
