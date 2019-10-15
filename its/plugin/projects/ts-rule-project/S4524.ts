export function toCreateModule() {}

function fooDefault(x: number) {
  switch (x) {
    case 1:
      return 1;
    default: // Noncompliant
      return 0;
    case 2:
      return 2;
  }
}

function barDefault(y: any) {
  switch (y) {
    default: // Noncompliant
      console.log("Default message");
      break;
    case "foo":
      console.log("Hello World")
      break;
    case "bar":
      console.log("42");
      break;
  }
}

function compliantDefault(z: any) {
  switch (z) {
    case "foo":
      console.log("Hello World")
      break;
    case "bar":
      console.log("42");
      break;
    default:
      console.log("Default message");
  }
}
