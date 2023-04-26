const torrent: string | any = client.get(infoHash); // Noncompliant {{'any' overrides all other types in this union type.}}
//                      ^^^

function foo(arg: string | SomeUnknownType) { // Compliant
}

function bar(arg: number & SomeUnknownType) { // Compliant
}

type FALSE = false;
type ZERO = 0;

type A = number;
type B = A | any; // Noncompliant
type C = number | never; // Noncompliant
//                ^^^^^

type D = false & boolean; // Noncompliant
type E = FALSE & boolean; // Noncompliant
type F = number & any; // Noncompliant
type G = number & never; // Noncompliant
type H = 0 & number; // Noncompliant
type I = ZERO & number; // Noncompliant
type J = '' & string; // Noncompliant
type K = 0n & bigint; // Noncompliant

const x: unknown | string = '42'; // Noncompliant

type hidden = unknown;
const y: hidden | string = '42'; // Compliant - FP
