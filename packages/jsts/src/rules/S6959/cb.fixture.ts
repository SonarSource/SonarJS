function noncompliant(xs: number[]) {
    return xs.reduce((acc, x) => acc + x); // Noncompliant {{Add an initial value to this "reduce()" call.}}
//            ^^^^^^
}

function compliant(xs: number[]) {
    return xs.reduce((acc, x) => acc + x, 0); // Compliant
}

function coverage(x: any) {
    x.m();
    x.reduce();
    x.reduce(42);
}
