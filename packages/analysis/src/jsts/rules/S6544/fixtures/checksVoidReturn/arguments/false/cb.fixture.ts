[1, 2].forEach(async num => {
  // Compliant
  await Promise.resolve(num);
});

// otherwise rule 'no-misused-promises' gets triggered second
new Promise(async resolve => { // Noncompliant {{Promise executor functions should not be async.}}
//          ^^^^^
  const a = await Promise.resolve(12);
  resolve(a);
}).catch(error => {});

(async () => {
  for (const url of ['http://yo.lo', 'http://tro-lo.lo']) {
    await fetch(url);
  }
})();

if (Promise.resolve(42)) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
  console.log('yolo');
}

declare function onSomeEvent(eventName: string, listener: () => void): void;

onSomeEvent('some-event', async () => { // Compliant
  await Promise.resolve();
});
