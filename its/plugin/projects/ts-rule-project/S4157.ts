function f<T = number>() {}
f();
f<string>();
f<number>(); // Noncompliant

function g<T = number, U = string>() {}
g();
g<number>(); // Noncompliant
g<string>();
g<number, number>();
g<string, string>(); // Noncompliant

class C<T = number> {}
new C();
new C<number>(); // Noncompliant
new C<string>();
