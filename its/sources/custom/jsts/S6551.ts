class Foo {};
const bar = new Foo();

bar + ''; // Noncompliant
`Foo: ${bar}`; // Noncompliant
bar.toString(); // Noncompliant

const foo = {};
foo + ''; // Noncompliant
`Foo: ${foo}`; // Noncompliant
foo.toString(); // Noncompliant
