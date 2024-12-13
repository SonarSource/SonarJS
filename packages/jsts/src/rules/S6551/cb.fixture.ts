function toStrings<T>(array: T[]): string[] {
  return array.map((item) => {
      if (item === undefined || item === null || !item.toString) {
          return null;
      } else {
          return item.toString(); // Compliant
      }
  });
}

function maybeString() {
  let foo: string | {};
  foo.toString() // Noncompliant {{'foo' may use Object's default stringification format ('[object Object]') when stringified.}}
}
