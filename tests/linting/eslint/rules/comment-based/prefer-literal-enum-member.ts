const hello = 'Hello';
enum Foo {
  STRING = hello, // Noncompliant {{Explicit enum value must only be a literal value (string, number, boolean, etc).}}
//^^^^^^
  OBJECT = { hello }.hello.length, // Noncompliant
  TEMPLATE = `${hello}, World`, // Noncompliant
  SET = new Set([hello, 'world']).size, // Noncompliant
  NUMBER = hello.length + 1, // Noncompliant
}

// Bitwise expressions are disallowed as the rule option 'allowBitwiseExpressions' is set to false
const enum RecursionFlags {
  None = 0,
  Source = 1 << 0, // Noncompliant
  Target = 1 << 1, // Noncompliant
  Both = Source | Target, // Noncompliant
}
