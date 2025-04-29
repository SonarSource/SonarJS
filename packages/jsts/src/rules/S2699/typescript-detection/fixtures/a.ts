import assert from "assert";

export function functionWithAssertion() {
  assert(true);
}

export function functionWithInnerAssertion() {
  functionWithAssertion();
}

export function functionWithoutAssertion() {
  console.log("Hello world");
}
