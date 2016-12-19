while(foo()) {
  bar();
  if (baz()) {
    break;
  }
}

while(foo()) {
  bar();
  break; // Noncompliant {{Remove this "break" statement or make it conditional}}
}

while(foo()) {
  bar();
  continue; // Noncompliant {{Remove this "continue" statement or make it conditional}}
}

while(foo()) {
  bar();
  throw x; // Noncompliant
//^^^^^
}

while(foo()) 
  break; // Noncompliant

function f() {
  while(foo()) {
    bar();
    if (baz()) {
      return;
    }
  }
  while(foo()) {
    bar();
    return; // Noncompliant
  }
}

do {
  bar();
  break; // Noncompliant
} while (foo())

for(;foo();) {
  bar();
  break; // Noncompliant
}

for(p in obj) {
  bar();
  break; // Compliant: often used to check whether an object is "empty"
}

for(p of obj) {
  bar();
  break; // Noncompliant
}

while(foo()) {
  if (bar()) {
    break;
  }
  baz();
  break; // Noncompliant
}


while(foo()) {
  if (bar()) {
    continue;
  }
  baz();
  break; // Compliant: the loop can execute more than once
}

while(foo()) {
  if (bar()) {
    continue;
  }
  baz();
  continue; // Noncompliant
}
