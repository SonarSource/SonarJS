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

function conditionalPromise(cond: boolean) {
  try { // Noncompliant
    if (cond) {
      returningPromise();
    } else {
      let x = 42;
      returningPromise();
    }
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

function okWithAnotherCall() {
  try {
    someFunc(); // can throw potentionally 
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}

function okWithoutCatch() {
  try {
    returningPromise();
  } finally {
    console.log("finally");
  }
}

async function severalTry() {
  try {
    await returningPromise();
  } catch (e) {
    console.log(e);
  }

  try { // Noncompliant
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}

function newPromise() {
  try { // Noncompliant
    new Promise((res, rej) => {});
  } catch (e) {
    console.log(e);
  }
}

function okWithNestedFunc() {
  try {
    let func = () => returningPromise();
  } catch (e) {
    console.log(e);
  }
}

function returningPromiseAndThrowing(cond: boolean) {
  if (cond) {
    return new Promise((res, rej) => {});
  } else {
    throw "error";
  }
}

// can be considered as False Positive as `returningPromiseAndThrowing` can throw
function testFunctionReturningPromiseAndThrowing(cond: boolean) {
  try { // Noncompliant
    returningPromiseAndThrowing(cond);
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

function uselessTryThenCatch() {
  try { // Noncompliant
    returningPromise().then().catch();
  } catch (e) {
    console.log(e);
  }
}

function onlyOnePromiseWhenChainedPromise() {
  try { // Noncompliant
    returningPromise().then(() => {});
  } catch (e) {
    console.log(e);
  }
}

async function okWithAwaitAndPromise() {
  try {
    await returningPromise(); // this can throw
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}
