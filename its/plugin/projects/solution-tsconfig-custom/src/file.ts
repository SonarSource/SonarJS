import { doOneMoreThing } from "./unlisted";

function foo(b: number, c: number) {
  if (b == 0) {
    // Noncompliant
    doOneMoreThing();
  } else {
    doOneMoreThing();
  }
}
