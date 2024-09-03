async function fetchData() {
  return Promise.resolve();
}

class MyClass {
  constructor() {
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
    Promise.resolve().then(() => this.data = fetchData()); //Noncompliant
  }
}