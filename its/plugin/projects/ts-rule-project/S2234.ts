function standardMethod() {
  const length = 1;
  const from = 0;
  return "abcdef".substr(length, from); // Noncompliant
}

class A {
  method(a: string, b: number, c: string, d: string) {}
}

let a = 4;
let b = "";
let c = "";
let d = "";

new A().method(b, a, c, d);
new A().method(b, a, d, c); // Noncompliant

function myFunction(a, b, c, d) {}

function testWithoutTypes(a, b, c, d) {
  myFunction(b, a, c, d); // Noncompliant
  myFunction(b, a, d, c); // Noncompliant
}
