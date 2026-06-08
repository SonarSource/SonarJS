function run(alert, window) {
  alert('x');
  window.confirm('y');
}

const globalThis = { prompt() {} };
globalThis.prompt('z');

const name = 'alert';
window[name]('w');
