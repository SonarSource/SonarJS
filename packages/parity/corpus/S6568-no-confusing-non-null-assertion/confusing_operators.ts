class Foo {}

let text: string | undefined;
const other = 'x';
text! = other;
text! == other;

declare const maybeFoo: Foo | undefined;
maybeFoo! instanceof Foo;

declare const maybeNumber: number | undefined;
const confusing = 1 + maybeNumber! === 3;
