// S4123: await-thenable — await is used on a non-thenable value
async function test() {
  const value = 42;
  await value; // Noncompliant
}
