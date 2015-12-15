if (condition) {
  action1();
  action2();
}

if (condition)
  action1();
  action2(); // Noncompliant {{This line will not be executed conditionally; only the first line of this 2-line block will be. The rest will execute unconditionally.}}

if (condition)
  action1();
  action2(); // Noncompliant [[secondary=+1]] {{This line will not be executed conditionally; only the first line of this 3-line block will be. The rest will execute unconditionally.}}
  action3();

if (condition)
  action1();
action2();

if (condition)
  action1();

  action2(); // Noncompliant

if (condition)
  action1();
  action2();  // Noncompliant [[secondary=+2]] {{This line will not be executed conditionally; only the first line of this 4-line block will be. The rest will execute unconditionally.}}

  action3();

if (condition)
action1();
action2();

  if (condition)
action1();
action2(); // compliant, less indented

if (condition) action1(); action2(); // compliant

function foo() {
  if (condition) {
    action1();
    action2();
  }

  if (condition)
    action1();
    action2(); // Noncompliant
}

for(var i = 1; i < 3; i++) {
    action1();
    action2();
}

for(var i = 1; i < 3; i++)
    action1();
    action2(); // Noncompliant {{This line will not be executed in a loop; only the first line of this 2-line block will be. The rest will execute only once.}}

for(var x in obj)
    action1();
    action2(); // Noncompliant {{This line will not be executed in a loop; only the first line of this 2-line block will be. The rest will execute only once.}}

for(var x of obj)
    action1();
    action2(); // Noncompliant {{This line will not be executed in a loop; only the first line of this 2-line block will be. The rest will execute only once.}}

while (condition) {
  action1();
  action2();
}

while (condition)
  action1();
  action2(); // Noncompliant {{This line will not be executed in a loop; only the first line of this 2-line block will be. The rest will execute only once.}}
