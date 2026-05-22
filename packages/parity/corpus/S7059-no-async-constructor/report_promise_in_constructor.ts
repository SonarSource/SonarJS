async function fetchData() {
  return Promise.resolve('value');
}

class Loader {
  constructor() {
    fetchData().then(value => console.log(value));
  }
}
