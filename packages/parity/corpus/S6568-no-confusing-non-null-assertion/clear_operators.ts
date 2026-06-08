class Foo {}

declare const maybeFoo: Foo | undefined;
declare const other: Foo;

maybeFoo! instanceof Foo;
maybeFoo! != other;
