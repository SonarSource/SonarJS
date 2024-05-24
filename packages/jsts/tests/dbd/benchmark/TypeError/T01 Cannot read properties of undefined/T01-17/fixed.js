var C = function () {

  this.values = [];

  this.f = function() {
    this.values.forEach(() => {
      42;
    });
  }

  this.g = function() {
    this.values = [];
  }
}

var c = new C();
c.f();

