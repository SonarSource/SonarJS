
[1,2].forEach(async (num) => { // Noncompliant
  await Promise.resolve(num);
});

new Promise(async (resolve) => { // Noncompliant {{Promise returned in function argument where a void return was expected.}}
  const a = await Promise.resolve(12);
  resolve(a);
});


