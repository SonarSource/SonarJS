export {};

type WrappedMessageEvent = MessageEvent & { originalEvent: MessageEvent };

window.addEventListener('message', (event: WrappedMessageEvent) => {
  const currentEvent = event.originalEvent || event;
  if (currentEvent.origin !== 'https://trusted.example') {
    return;
  }
});
