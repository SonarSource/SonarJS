const o = {
    p: "foo",
    p: "bar"
  // Noncompliant@-1 [[qf1]] {{Duplicate name 'p'.}}
  // fix@qf1 {{Remove this duplicate property}}
  // edit@qf1@-1 {{    p: "foo"}}
  // del@qf1
};

class C {
    m() {}
    m() {} // Noncompliant {{Duplicate name 'm'.}}
}

class D {
    m(n: number): void;
    m(s: string): void; // Compliant - TypeScript's method overloading
}
