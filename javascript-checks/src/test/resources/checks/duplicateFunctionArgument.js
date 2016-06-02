function fun1(
a,
  a,   // Noncompliant [[secondary=-1]] {{Rename the duplicated function parameter "a".}}
//^
  \u0061,   // Noncompliant [[secondary=-3]] {{Rename the duplicated function parameter "\u0061".}}
//^^^^^^
b,
c,
c,   // Noncompliant [[secondary=-1]] {{Rename the duplicated function parameter "c".}}
c,   // Noncompliant [[secondary=-2]] {{Rename the duplicated function parameter "c".}}
d
) {}

function fun2(
a
) {}

function fun3(
) {}

function fun4(a, ...a) {     // Noncompliant {{Rename the duplicated function parameter "a".}}
//                  ^
}

function fun5({a, b:{a}}) {  // Noncompliant [[secondary=+0]] {{Rename the duplicated function parameter "a".}}
//                   ^
}

function* func6(a, a) {      // Noncompliant
}
