
function bar() {
  var foo = 42; // Noncompliant [[qf1!]] {{Unexpected var, use let or const instead.}}
//^^^^^^^
// edit@qf1 {{  let foo = 42;}}

  var x, y = qz(); // Noncompliant [[qf2!]] {{Unexpected var, use let or const instead.}}
//^^^^^
// edit@qf2 {{  let x, y = qz();}}
}
