
[1,2].forEach(async (num) => { // Noncompliant
  await Promise.resolve(num);
});

// rule 'no-floating-promises' triggers first
new Promise(async (resolve) => { // Noncompliant {{Promises must be awaited, end with a call to .catch, or end with a call to .then with a rejection handler.}}
  const a = await Promise.resolve(12);
  resolve(a);
});

// otherwise rule 'no-misused-promises' gets triggered second
new Promise(async (resolve) => { // Noncompliant {{Promise returned in function argument where a void return was expected.}}
  const a = await Promise.resolve(12);
  resolve(a);
}).catch(error => {});

(async () => {
  for (const url of ['http://yo.lo', 'http://tro-lo.lo']) {
    await fetch(url);
  }
})();

