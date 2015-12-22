function fun1(  // Noncompliant {{Rename the duplicated function parameters "a", "\u0061", "c".}}
a,
a,
\u0061,
b,
c,
c,
d
) {}

function fun2(
a
) {}

function fun3(
) {}

function fun4(a, ...a) {     // Noncompliant {{Rename the duplicated function parameter "a".}}
}

function fun5({a, b:{a}}) {  // Noncompliant {{Rename the duplicated function parameter "a".}}
}

function* func6(a, a) {      // Noncompliant
}
