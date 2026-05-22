export {};

function handle(value: unknown) {
  void value;
}

window.addEventListener('message', event => {
  handle(event.data);
});
