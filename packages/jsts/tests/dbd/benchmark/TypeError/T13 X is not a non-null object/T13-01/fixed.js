const mergeInto = {};
const prop = 'foo';
const mergeFrom = {};

var descriptor = Object.getOwnPropertyDescriptor(Object(mergeFrom), prop);
if (descriptor) {
  Object.defineProperty(mergeInto, prop, descriptor);
}
