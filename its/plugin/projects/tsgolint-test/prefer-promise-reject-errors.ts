// S6671: prefer-promise-reject-errors — reject should use an Error object
const p = new Promise((resolve, reject) => {
  reject('error'); // Noncompliant: should use new Error('error')
});
