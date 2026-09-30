
function bar() {
  var foo = 42; // Noncompliant [[qf1!]] {{Replace `var` with `let` or `const`, which are scoped to the block that declares them.}}
//^^^^^^^
// edit@qf1 {{  let foo = 42;}}

  var x, y = qz(); // Noncompliant [[qf2!]] {{Replace `var` with `let` or `const`, which are scoped to the block that declares them.}}
//^^^^^
// edit@qf2 {{  let x, y = qz();}}
}
