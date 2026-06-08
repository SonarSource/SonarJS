export {};

function processEvent(event: MessageEvent) {
  if (event.origin !== 'https://trusted.example') {
    return;
  }
}

window.addEventListener('message', processEvent);
