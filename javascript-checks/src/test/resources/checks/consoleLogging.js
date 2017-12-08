  console.log("Foo"); // Noncompliant {{Remove this logging statement.}}
//^^^^^^^^^^^
  console.warn("Foo"); // Noncompliant {{Remove this logging statement.}}
  console.error("Foo"); // Noncompliant {{Remove this logging statement.}}
console.group();    // OK

myObject.log();     // OK

