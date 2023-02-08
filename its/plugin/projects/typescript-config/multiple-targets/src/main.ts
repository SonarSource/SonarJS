import { CONSTANT } from "./constants";

function foo(value: string) {
  return value < CONSTANT;
}

console.log(foo("10") ? "SUCCESS" : "FAILURE");
