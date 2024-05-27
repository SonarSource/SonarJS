const { CanvasRenderService } = require('./dep'); // fixture

function foo() {
  this.width = 42;
  this.height = 42;
  const chartCallback = () => {};

  const canvas = new CanvasRenderService(this.width,this.height,chartCallback); // Noncompliant: constructor name changed between major versions
}

foo();
