async function foo() {
  const x = 42;
  await x; // Noncompliant

  const x2 = new Promise(resolve => resolve(x));
  await x2;
}
