// rule 'no-async-promise-executor' triggers only in JS
new Promise(async (resolve) => { // Noncompliant {{Promise executor functions should not be async.}}
  const a = await Promise.resolve(12);
  resolve(a);
});

