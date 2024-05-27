const mergeInto = {};
const prop = 'foo';
const mergeFrom = {};

Object.defineProperty(mergeInto, prop, Object.getOwnPropertyDescriptor(Object(mergeFrom), prop)); // Noncompliant: Object.getOwnPropertyDescriptor(Object(mergeFrom), prop) can return undefined
