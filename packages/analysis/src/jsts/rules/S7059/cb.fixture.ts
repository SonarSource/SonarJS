async function fetchData() {
  return Promise.resolve();
}

class MyClass {
  constructor() {
    this.init = () => this.data = fetchData(); // compliant, declarations are not executed
    this.data = null;
  }

  async initialize() {
    this.data = await fetchData();
  }
}

(async () => {
  const myObject = new MyClass();
  await myObject.initialize();
})();


class MyClass {
  constructor() {
    console.log('correct');
    Promise.resolve().then(() => this.data = fetchData()); //Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class TaskQueue {
  private tail: Promise<void>;
  constructor() {
    this.tail = Promise.resolve();
    this[0] = Promise.resolve();
  }
}

class SentinelSyntax {
  constructor(ready: boolean) {
    this.tail = (Promise /* ready */ . resolve(/* no value */));
    this.tail = Promise.resolve() as Promise<void>;
    this.tail = Promise.resolve() satisfies Promise<void>;
    this.tail = Promise.resolve()!;
    this.tail = <Promise<void>>Promise.resolve();
    this.tail = ((<Promise<void>>Promise.resolve()) satisfies Promise<void>)! as Promise<void>;
    if (ready) {
      this.tail = Promise.resolve();
    }
    this.init = () => Promise.resolve(); // compliant, the function is not executed
  }
}

class PromiseArguments {
  constructor(thenable: PromiseLike<void>) {
    this.tail = Promise.resolve(undefined); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(undefined) as Promise<void>; // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this['tail'] = Promise.resolve(undefined); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(null); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(1); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(thenable); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(Promise.resolve()); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(...[]); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class AsynchronousOperations {
  constructor() {
    this.tail = Promise.resolve().then(() => this.data = fetchData()); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve().catch(() => {}); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve().finally(() => {}); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve().then(() => {}) satisfies Promise<void>; // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.reject(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.all([]); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.race([]); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = fetchData(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = new Promise<void>(resolve => queueMicrotask(resolve)).then(() => {}); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class ShadowedPromiseParameter {
  constructor(Promise: PromiseConstructor) {
    this.tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this['tail'] = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class ShadowedPromiseObject {
  constructor() {
    const Promise = { resolve: async () => {} };
    this.tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve()!; // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

declare function getCustomPromise(): { resolve(): Promise<void> };

class CustomPromise {
  constructor() {
    const Promise: { resolve(): Promise<void> } = getCustomPromise();
    this.tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class PromiseAlias {
  constructor() {
    const P = Promise;
    this.tail = P.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

function wrap(value: Promise<void>): void {}

class OtherPromiseUses {
  constructor(other: { tail: Promise<void> }) {
    this.tail = Promise['resolve'](); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this['tail'] = Promise.resolve();
    other.tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    other['tail'] = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail ||= Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this['tail'] ||= Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = wrap(Promise.resolve()); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = <Promise<void>><unknown>wrap(Promise.resolve()); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = (fetchData(), Promise.resolve()) as Promise<void>; // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.tail = Promise.resolve(), fetchData(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    fetchData(), this.tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    return Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class PrivateTaskQueue {
  #tail: Promise<void>;
  constructor() {
    this.#tail = Promise.resolve();
  }
}

class PrivateAsynchronousTaskQueue {
  #tail: Promise<void>;
  constructor() {
    this.#tail = Promise.resolve().then(() => {}); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

declare function getName(): string;

class DynamicFieldTaskQueue {
  constructor(name: string) {
    this[name] = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this[getName()] = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this[`tail${name}`] = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}
