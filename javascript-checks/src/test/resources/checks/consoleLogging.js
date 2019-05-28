  console.log("Foo"); // Noncompliant {{Replace this usage of console.log by a logger.}}
//^^^^^^^^^^^
  console.warn("Foo"); // Noncompliant {{Replace this usage of console.warn by a logger.}}
  console.error("Foo"); // Noncompliant {{Replace this usage of console.error by a logger.}}
console.group();    // OK

myObject.log();     // OK

