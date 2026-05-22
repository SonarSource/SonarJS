export {};

type WrappedMessageEvent = MessageEvent & { originalEvent: MessageEvent };

window.addEventListener('message', (event: WrappedMessageEvent) => {
  const origin = event.originalEvent.origin || event.origin;
  console.log(origin);
});
