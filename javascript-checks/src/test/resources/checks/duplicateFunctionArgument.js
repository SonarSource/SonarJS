function fun1(
a, // OK
a, // NOK
\u0061, // NOK
b, // OK
c, // OK
c, // NOK
d // OK
) {}

function fun2(
a // OK
) {}

function fun3(
) {}

function fun4(a, ...a) { // NOK
}

function fun5({a, b:{a}}) {  // NOK
}
