function foo(b: number) {
  if (b == 0) { doOneMoreThing(); } else { doOneMoreThing(); } // NOSONAR
  if (b == 0) { doOneMoreThing(); } else { doOneMoreThing(); }
}
