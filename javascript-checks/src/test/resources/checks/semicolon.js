function sayHello() {
  var a = { // NOK
    'i': 1,
    'j': 2
  }

  return 1 // NOK

  if (condition) { // OK
  }

  for (i = 0; i < 10; i++) { // OK
  }

  label: while (condition) { // OK
    break label; // OK
  }

  return 1; // OK
}

import x from 'mod'  // KO
import x from 'mod'; // OK
import 'mod'  // KO
import 'mod'; // OK

function f() {
  do {} 
  while (false) // KO
  do {} 
  while (false); // OK
  throw x  // KO
  throw x; // OK
  debugger  // KO
  debugger; // OK
  while(false) {
    continue  // KO
    continue; // OK
  }
}

export const a = 1;
export const a = 1 // Noncompliant
export {};
export {}          // Noncompliant
export default x;
export default x   // Noncompliant
export default class A {}
export default function f() {}
export default function () {} // Noncompliant

export var NodeContainer = assert.define('NodeContainer', function(obj) {
  assert(obj).is(assert.structure({
    childNodes: ArrayLikeOfNodes,
    nodeType: assert.number
  }));
});

export class _LinkedListItem {
  static _initialize(item) {
    // TODO: Traceur assertions
    // assert(typeof item._previous === "undefined");
    // assert(typeof item._next === "undefined");
    item._next = item._previous = null;
  }
}
