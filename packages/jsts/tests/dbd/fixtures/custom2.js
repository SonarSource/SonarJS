class name {
  constructor() {
    this.field = 1;
  }
}

function foo() {
  return;
}
const bla = {
  dirname(path) {
    return path.toLowerCase();
  }
}

export default bla;

export {foo, foo as bar};

export const constant = 67;

export { constant as another }

const obj = {foo: 1, bar: 1, baz: foo};

const anotherObj = {goo: obj, name}