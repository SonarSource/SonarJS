let condition, start, stop;
let doSomething = () => {};
let doSomethingElse = () => {};

if (condition) {
  doSomething();
} else {
  doSomethingElse();
}
if (condition) {
  doSomething();
}
else {
  doSomethingElse();
}
functionWithObject(
   {
        g: "someValue"
   }
);

function f() {
  if (!start || !stop) { return; }
  else { return start; }
}

//Noncompliant@+2 [[qf1!]]
if (condition)
{
  doSomething();
}
// del@qf1
// edit@qf1@-1 {{if (condition) {}}

//Noncompliant@+1 [[qf2!]]
if (condition) { doSomething()
}
// add@qf2@+1 {{ doSomething()}}
// edit@qf2 [[sc=16]] {{}}

