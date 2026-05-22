function returningPromise() {
  return Promise.reject();
}

async function valid() {
  try {
    await returningPromise();
  } catch (e) {
    console.log(e);
  }
}
