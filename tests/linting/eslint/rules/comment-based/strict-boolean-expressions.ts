(function (b: boolean) {
    if (b) {}
});

(function (b: boolean | undefined) {
    if (b) {}
});

(function (a: any) {
    if (a) {}
});

(function (s: string) {
    if (s) {} // Noncompliant
});

(function (x: number[]) {
    if (x.length) {} // Noncompliant
});

(function (n: number) {
    if (n) {} // Noncompliant
});

(function f(b: bigint) {
    if (b) {} // Noncompliant
});

(function (n: number | null) {
    if (n) {} // Noncompliant - FP if `strictNullChecks` not set to `true`
});
