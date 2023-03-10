const o = {
    p: "foo",
    p: "bar" // Noncompliant {{Duplicate name 'p'.}}
};

class C {
    m() {}
    m() {} // Noncompliant {{Duplicate name 'm'.}}
}

class D {
    m(n: number): void;
    m(s: string): void; // Compliant - TypeScript's method overloading
}
