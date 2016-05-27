function func1() {
}

function func2(p1, p2, p3, p4, p5, p6, p7, p8) { // Noncompliant {{Function has 8 parameters which is greater than 7 authorized.}}
//            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
}

function * func2(p1, p2, p3, p4, p5, p6, p7, p8) { // Noncompliant
}
