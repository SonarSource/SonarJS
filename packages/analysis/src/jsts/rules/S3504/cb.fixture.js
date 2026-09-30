
function bar() {
  var foo = 42; // Noncompliant [[qf1!]] {{Use `let` or `const`: `var` leaks out of blocks.}}
//^^^^^^^
// edit@qf1 {{  let foo = 42;}}

  var x, y = qz(); // Noncompliant [[qf2!]] {{Use `let` or `const`: `var` leaks out of blocks.}}
//^^^^^
// edit@qf2 {{  let x, y = qz();}}
}
