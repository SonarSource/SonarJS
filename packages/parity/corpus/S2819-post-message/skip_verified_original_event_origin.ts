export {};

type WrappedMessageEvent = MessageEvent & { originalEvent: MessageEvent };

function handle(value: unknown) {
  void value;
}

window.addEventListener('message', (event: WrappedMessageEvent) => {
  if (event.originalEvent.origin === 'https://trusted.example') {
    handle(event.data);
  }
});
