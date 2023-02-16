import { CONSTANT } from "constant.js";
function foo() {
  const value = "10";
  return value < CONSTANT; // Noncompliant: S3003
}

console.log(foo() ? "SUCCESS" : "FAILURE");
