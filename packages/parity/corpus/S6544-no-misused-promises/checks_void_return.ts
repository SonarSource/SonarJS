declare function onSomeEvent(eventName: string, listener: () => void): void;

onSomeEvent('some-event', async () => {
  await Promise.resolve();
});

if (Promise.resolve(42)) {
  console.log('yolo');
}
