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
    Promise.resolve().then(() => this.data = fetchData()); //Noncompliant
  }
}
