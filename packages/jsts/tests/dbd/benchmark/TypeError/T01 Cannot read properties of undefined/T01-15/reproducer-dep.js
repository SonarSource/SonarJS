function foo(args) {
  const opt = args.v || args.value; // Noncompliant: args can be undefined
}

module.exports = foo;
