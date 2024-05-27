var ProgressReporter = function () {

  this.onInput = function() {
    this.values.push(42); // Noncompliant: this.values can be undefined
  }

  this.onStart = function() {
    this.values = [];
  }
}

var pr = new ProgressReporter();
pr.onInput();
