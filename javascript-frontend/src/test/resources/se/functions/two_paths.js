function main() {

  var func;

  if (condition) {
    func = function() { foo(); }
  } else {
    func = function() { bar(); }
  }

  foo(func);
}
