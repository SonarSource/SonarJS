const valid = new Set([1,2,3]);

function filterValid(arr) {
  return arr.filter(valid.has); // Noncompliant: Method Set.prototype.has called on incompatible receiver undefined
}

filterValid([1]);
