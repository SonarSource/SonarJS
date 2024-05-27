function assignSetLiteral() {
  let s = new Set([42, 0]);
}

function setLiteralAsArgument() {
  console.log(new Set([42, 0]));
}

function assignDictLiteral() {
  let s = {'k1': 42, 'k2': 0};
}

function dictLiteralAsArgument() {
  console.log({'k1': 42, 'k2': 0});
}

function emptyDictLiteral() {
  let s = {};
}

function dictLiteralWithUnpackingOnParam(d1) {
  let d = {'a': 1, ...d1};
}

function tupleLiteralWithUnpacking() {
  let s1 = [1, 2];
  let s2 = [3, 4, ...s1];
}

function setLiteralWithUnpacking() {
  let s1 = new Set([1, 2]);
  let s2 = new Set([3, 4, ...s1]);
}

function dictLiteralWithUnpacking() {
  let d1 = {'a': 1, 'b': 2};
  let d2 = {'x': 3, 'y': 4};
  console.log({'e': 5, ...d1, 'f': 6, ...d2});
}
