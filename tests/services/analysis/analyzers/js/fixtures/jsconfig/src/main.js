import { CONSTANT } from "constant.js";
function foo() {
  const v = "10";
  return CONSTANT < v;
}

console.log(foo() ? "SUCCESS" : "FAILURE");
