  console.log("Foo"); // Noncompliant {{Remove this logging statement.}}
//^^^^^^^^^^^
console.group();    // OK

myObject.log();     // OK
