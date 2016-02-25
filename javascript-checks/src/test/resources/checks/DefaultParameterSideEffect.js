var x = y++;

function foo(p = x++) {  // Noncompliant [[sc=14;ec=21]]
  p++;
}

function foo(
  p1 = --x,  // Noncompliant
  p2 = ++x,  // Noncompliant
  p3 = x--) {  // Noncompliant
}

class A {
  bar({a, b} = {a: 42 + x++, b: 42}) { // Noncompliant {{Remove the side effects from this default assignment of "{a, b}".}}
  }
}

foo(x = y++);

function foo(p, ...args) {
}
