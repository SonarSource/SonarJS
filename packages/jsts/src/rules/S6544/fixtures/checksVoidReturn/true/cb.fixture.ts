[1, 2].forEach(async num => { // Noncompliant
  await Promise.resolve(num);
});

// otherwise rule 'no-misused-promises' gets triggered second
new Promise(async (resolve) => { // Noncompliant {{Promise returned in function argument where a void return was expected.}}
//                          ^^
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

import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();
eventEmitter.on('some-event', async () => { // Noncompliant
  await Promise.resolve();
});
