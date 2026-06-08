function returningPromise() {
  return Promise.reject();
}

function invalid() {
  try {
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}
