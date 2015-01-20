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
