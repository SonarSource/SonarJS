function withNull(x: number & null) {} // Noncompliant

function withUndefined(x: { a: string } & undefined) {} // Noncompliant

function withVoid(x: string & void) {} // Noncompliant

function triple(
  x: null // Noncompliant
  & string
  & undefined) {} // Noncompliant

function declarations() {
  let x: string & null; // Noncompliant
}

function withEmptyObjectLiteral(x: { a: string } & {}) {} // Noncompliant

interface Empty {}
function withEmptyInterface(x: { a: string } & Empty) {} // Noncompliant

function withAny(x: any & { a: string }) {} // Noncompliant

function withNever(x: boolean & never) {} // Noncompliant

// OK
function twoPrimitives(x: string & number) {}

// OK
function twoInterfaces(x: { a: string } & { b: number }) {}

// OK, extended interface
interface WithString {
  a: string;
}
interface NotEmpty extends WithString {}
function withNotEmptyInterface(x: { a: string } & NotEmpty) {}
