type Numbers        = number[];
type MaybeString    = string | undefined;
type pi             = 3.14;
type NoIdea         = WhoKnows;
type StringArray    = Array<string>;
type AnyArray       = Array<>;

type MyAny          = any;          // Noncompliant {{Remove this redundant type alias and replace its occurrences with "any".}}
//   ^^^^^
type MyBigInt       = bigint;       // Noncompliant {{Remove this redundant type alias and replace its occurrences with "bigint".}}
type MyBoolean      = boolean;      // Noncompliant {{Remove this redundant type alias and replace its occurrences with "boolean".}}
type MyNever        = never;        // Noncompliant {{Remove this redundant type alias and replace its occurrences with "never".}}
type MyNull         = null;         // Noncompliant {{Remove this redundant type alias and replace its occurrences with "null".}}
type MyNumber       = number;       // Noncompliant {{Remove this redundant type alias and replace its occurrences with "number".}}
type MyString       = string;       // Noncompliant {{Remove this redundant type alias and replace its occurrences with "string".}}
type MySymbol       = symbol;       // Noncompliant {{Remove this redundant type alias and replace its occurrences with "symbol".}}
type MyUndefined    = undefined;    // Noncompliant {{Remove this redundant type alias and replace its occurrences with "undefined".}}
type MyUnknown      = unknown;      // Noncompliant {{Remove this redundant type alias and replace its occurrences with "unknown".}}
type MyVoid         = void;         // Noncompliant {{Remove this redundant type alias and replace its occurrences with "void".}}
type MyPiAlias      = pi;           // Noncompliant {{Remove this redundant type alias and replace its occurrences with "pi".}}
