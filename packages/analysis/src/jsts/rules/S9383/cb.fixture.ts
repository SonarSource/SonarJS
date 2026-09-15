declare function fetchData(): Promise<string>;
declare const subscribers: { notify(): Promise<void> }[];

function floatingStatement() {
  fetchData(); // Noncompliant [[qf1,qf2=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.}}
  // fix@qf1 {{Add void operator to ignore.}}
  // edit@qf1 {{  void fetchData();}}
  // fix@qf2 {{Add await operator.}}
  // edit@qf2 {{  await fetchData();}}
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
  fetchData().then(value => console.log(value)); // Noncompliant [[qf3,qf4=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.}}
  // fix@qf3 {{Add void operator to ignore.}}
  // edit@qf3 {{  void fetchData().then(value => console.log(value));}}
  // fix@qf4 {{Add await operator.}}
  // edit@qf4 {{  await fetchData().then(value => console.log(value));}}
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

function anyTypedRejectionHandlerIsAssumedCallable(next: any) {
  fetchData().catch(next);
}

function nonFunctionRejectionHandlerIsStillReported(next: string) {
  fetchData().catch(next); // Noncompliant [[qf7,qf8=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator. A rejection handler that is not a function will be ignored.}}
  // fix@qf7 {{Add void operator to ignore.}}
  // edit@qf7 {{  void fetchData().catch(next);}}
  // fix@qf8 {{Add await operator.}}
  // edit@qf8 {{  await fetchData().catch(next);}}
}

declare const maybePromise: Promise<void> | undefined;

function optionalChainingIsOutOfScopeAndStillReported(next: any) {
  fetchData()?.catch(next); // Noncompliant [[qf9,qf10=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator. A rejection handler that is not a function will be ignored.}}
  // fix@qf9 {{Add void operator to ignore.}}
  // edit@qf9 {{  void fetchData()?.catch(next);}}
  // fix@qf10 {{Add await operator.}}
  // edit@qf10 {{  await fetchData()?.catch(next);}}
  maybePromise?.then(undefined, next); // Noncompliant [[qf11,qf12=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator. A rejection handler that is not a function will be ignored.}}
  // fix@qf11 {{Add void operator to ignore.}}
  // edit@qf11 {{  void maybePromise?.then(undefined, next);}}
  // fix@qf12 {{Add await operator.}}
  // edit@qf12 {{  await maybePromise?.then(undefined, next);}}
}

function computedMemberAccessIsOutOfScopeAndStillReported(next: any) {
  fetchData()['catch'](next); // Noncompliant [[qf13,qf14=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator. A rejection handler that is not a function will be ignored.}}
  // fix@qf13 {{Add void operator to ignore.}}
  // edit@qf13 {{  void fetchData()['catch'](next);}}
  // fix@qf14 {{Add await operator.}}
  // edit@qf14 {{  await fetchData()['catch'](next);}}
  fetchData()[`then`](undefined, next); // Noncompliant [[qf15,qf16=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator. A rejection handler that is not a function will be ignored.}}
  // fix@qf15 {{Add void operator to ignore.}}
  // edit@qf15 {{  void fetchData()[`then`](undefined, next);}}
  // fix@qf16 {{Add await operator.}}
  // edit@qf16 {{  await fetchData()[`then`](undefined, next);}}
}

function floatingAsyncIife() {
  (async () => { // Noncompliant [[qf5,qf6=0]] {{Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.}}
  // fix@qf5 {{Add void operator to ignore.}}
  // edit@qf5 {{  void (async () =>}}
  // fix@qf6 {{Add await operator.}}
  // edit@qf6 {{  await (async () =>}}
    await fetchData();
  })();
}
