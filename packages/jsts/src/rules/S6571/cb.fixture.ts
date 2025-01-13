const torrent: string | any = client.get(infoHash); // Noncompliant {{'any' overrides all other types in this union type.}}
//                      ^^^

function foo(arg: string | SomeUnknownType) { // Compliant
}

function bar(arg: number & SomeUnknownType) { // Compliant
}

type FALSE = false;
type ZERO = 0;

type A = number;
type B = A | any; // Noncompliant {{'any' overrides all other types in this union type.}}
type C = number | never; // Noncompliant {{'never' is overridden by other types in this union type.}}
//                ^^^^^

type D = false & boolean; // Noncompliant {{boolean is overridden by the false in this intersection type.}}
type E = FALSE & boolean; // Noncompliant {{boolean is overridden by the false in this intersection type.}}
type F = number & any; // Noncompliant {{'any' overrides all other types in this intersection type.}}
type G = number & never; // Noncompliant {{'never' overrides all other types in this intersection type.}}
type H = 0 & number; // Noncompliant {{number is overridden by the 0 in this intersection type.}}
type I = ZERO & number; // Noncompliant {{number is overridden by the 0 in this intersection type.}}
type J = '' & string; // Noncompliant {{string is overridden by the "" in this intersection type.}}
type K = 0n & bigint; // Noncompliant {{bigint is overridden by the 0n in this intersection type.}}

const x: unknown | string = '42'; // Noncompliant {{'unknown' overrides all other types in this union type.}}

type hidden = unknown;
const y: hidden | string = '42'; // Compliant - FP
