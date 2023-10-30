function doSomething() {
  for (let i = 0; i < 42; i++) { // Noncompliant {{No magic number: 42}}
    // ...
  }
}

function doSomething() {
  const numberOfCycles = 4;
  for (let i = 0; i > numberOfCycles; i++) {
    // ...
  }
}

var x = {
  a: 42, // Compliant
};

parseInt('42', 10);
Number.parseInt('42', 10);
renderer.$maxLines = 4;
Parser.MEDIA_QUERY_TYPE = 3;
const z = -42;


const dec = y / 1_000;
const bin = y / 1024

function foo(d = 42) {
}

const value = (hash >> (i * 8)) & 0xff;

JSON.stringify({ a: 2 }, null, 7);
