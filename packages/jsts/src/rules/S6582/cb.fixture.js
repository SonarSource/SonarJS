function f() {
    foo && foo.a; // Noncompliant {{Prefer using an optional chain expression instead, as it's more concise and easier to read.}}
//  ^^^^^^^^^^^^
}
