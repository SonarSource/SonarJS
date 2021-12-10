// this file is not listed in tsconfig.json, but it's referenced from file.ts

export function doOneMoreThing() {
  if (condition) {
    // Noncompliant
    doOneMoreThing();
  } else {
    doOneMoreThing();
  }
}
