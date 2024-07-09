function f() {
  if (cond()) {
    return foo() // Noncompliant [[qf1!]]
// edit@qf1 [[sc=16]] {{;}}
  } else {
    return bar();
  }
}

var name = "ESLint" //Noncompliant [[qf2!]]
// edit@qf2 [[sc=19]] {{;}}

object.method = function() {
  // ...
} // Noncompliant [[qf3!]]
// edit@qf3 [[sc=1]] {{;}}

class Foo {
  bar = 1  // Noncompliant [[qf4!]]
// edit@qf4 [[sc=9]] {{;}}
}
