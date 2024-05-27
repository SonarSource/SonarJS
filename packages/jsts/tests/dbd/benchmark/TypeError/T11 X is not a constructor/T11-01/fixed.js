const { ChartJSNodeCanvas } = require('./dep'); // fixture

function foo() {
  this.width = 42;
  this.height = 42;
  const chartCallback = () => {};

  const canvasOptions = {
    width: this.width,
    height: this.height,
    chartCallback: chartCallback,
  };
  const canvas = new ChartJSNodeCanvas(canvasOptions);
}

foo();
