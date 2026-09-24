class JsTaskQueue {
  constructor() {
    this.tail = Promise.resolve();
    this['tail'] = Promise.resolve();
    this[0] = Promise.resolve();
  }
}

class JsPrivateTaskQueue {
  #tail;
  constructor() {
    this.#tail = Promise.resolve();
  }
}

class JsAsynchronousTaskQueue {
  #tail;
  constructor() {
    this.tail = Promise.resolve().then(() => this.data = 'ready'); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this['tail'] = Promise.resolve(undefined); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.#tail = Promise.resolve().then(() => {}); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}

class JsShadowedPromise {
  #tail;
  constructor() {
    const Promise = { resolve: async () => {} };
    this.tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
    this.#tail = Promise.resolve(); // Noncompliant {{Refactor this asynchronous operation outside of the constructor.}}
  }
}
