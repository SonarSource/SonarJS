export {};

function handle(value: unknown) {
  void value;
}

window.addEventListener('message', event => {
  if (event.origin === 'https://trusted.example') {
    handle(event.data);
  }
});
