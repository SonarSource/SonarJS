var ProgressReporter = function () {

  this.values = [];

  this.onInput = function() {
    this.values.push(42);
  }

  this.onStart = function() {
    this.values = [];
  }
}

var pr = new ProgressReporter();
c.onInput();
