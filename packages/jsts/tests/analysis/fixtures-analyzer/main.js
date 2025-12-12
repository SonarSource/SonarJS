const assert = require('chai').assert;
const promise = new Promise(resolve => resolve(42));
assert.equal(promise, promise);
