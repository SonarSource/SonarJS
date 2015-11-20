function isArrayLike (obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function size (obj) {
  if (obj == null) {
    return 0;
  }
  return isArrayLike(obj) ? obj.length : Object.keys(obj).length;
}

module.exports = size;
