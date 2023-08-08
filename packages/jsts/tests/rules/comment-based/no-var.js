
function bar() {
  var foo = 42; // Noncompliant [[qf1!]]
//^^^^^^^
// edit@qf1 {{  let foo = 42;}}

  var x, y = qz(); // Noncompliant [[qf2!]]
//^^^^^
// edit@qf2 {{  let x, y = qz();}}
}
