const valid = new Set([1,2,3]);

function filterValid(arr) {
  return arr.filter(valid.has.bind(valid));
}

filterValid([1]);