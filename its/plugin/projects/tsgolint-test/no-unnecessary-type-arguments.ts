// S4157: no-unnecessary-type-arguments — type argument is the default
function identity<T = string>(x: T): T {
  return x;
}
const result = identity<string>('hello'); // Noncompliant: string is the default
