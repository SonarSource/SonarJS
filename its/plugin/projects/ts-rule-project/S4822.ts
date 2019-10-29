function returningPromise() {
  return Promise.reject();
}

function singlePromise() {
  try { // Noncompliant
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}

async function okWithAwait() {
  try {
    await returningPromise();
  } catch (e) {
    console.log(e);
  }
}

function uselessTry() {
  try { // Noncompliant
    returningPromise().catch();
  } catch (e) {
    console.log(e);
  }
}
