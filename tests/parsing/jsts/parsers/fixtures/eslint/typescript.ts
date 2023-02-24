type T = number | string;

function f(t: T): number {
  return t as number;
}
