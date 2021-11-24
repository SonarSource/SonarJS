
import * as lib from './lib'

function foo(a: number, b: number) {
  if (b == 0) { // Noncompliant - this issue is found
    return a;
  } else {
    return a;
  }
}

console.log(lib.add(0, 2));
