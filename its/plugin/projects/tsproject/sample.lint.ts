/*eslint max-params: ["error", 1]*/

function foo(b: number, c: number) {
  if (b == 0) { // Noncompliant  
    doOneMoreThing();
  } else {
    doOneMoreThing();
  }
}
