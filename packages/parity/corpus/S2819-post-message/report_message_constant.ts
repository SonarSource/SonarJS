export {};

const eventType = 'message';

function eventHandler(event: MessageEvent) {
  console.log(event.data);
}

window.addEventListener(eventType, eventHandler);
