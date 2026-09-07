declare function fetchData(): Promise<string>;
declare const subscribers: { notify(): Promise<void> }[];

function floatingStatement() {
  fetchData(); // Noncompliant {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.}}
}

async function awaited() {
  await fetchData();
}

function returned() {
  return fetchData();
}

function caught() {
  fetchData().catch(error => console.error(error));
}

function thenWithRejectionHandler() {
  fetchData().then(value => console.log(value), error => console.error(error));
}

function thenWithoutRejectionHandler() {
  fetchData().then(value => console.log(value)); // Noncompliant {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.}}
}

function explicitlyIgnoredWithVoid() {
  void fetchData();
}

function floatingPromiseArray() {
  subscribers.map(subscriber => subscriber.notify()); // Noncompliant {{An array of Promises may be unintentional. Consider handling the promises' fulfillment or rejection with Promise.all or similar, or explicitly marking the expression as ignored with the `void` operator.}}
}

async function handledPromiseArray() {
  await Promise.all(subscribers.map(subscriber => subscriber.notify()));
}

function floatingAsyncIife() {
  (async () => { // Noncompliant {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.}}
    await fetchData();
  })();
}
