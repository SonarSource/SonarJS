async function fetchData() {
  return Promise.resolve('value');
}

class Loader {
  task: () => Promise<string>;

  constructor() {
    this.task = () => fetchData();
  }
}
