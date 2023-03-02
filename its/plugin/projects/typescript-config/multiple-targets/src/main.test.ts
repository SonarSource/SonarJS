import { CONSTANT } from "constants";

function test() {
  const b: boolean = "10" < CONSTANT;
  console.log(`Test successful: ${b}`);
}

test();
