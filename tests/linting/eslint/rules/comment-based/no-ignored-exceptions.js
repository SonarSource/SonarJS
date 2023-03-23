function f() {
    try {
        doSomething();
    } catch (err) { // Noncompliant {{Handle this exception or don't catch it at all.}}

    }
}

function g() {
    try {
        doSomething();
    } catch (err) { // Compliant
        console.log(`Exception while doing something: ${err}`);
    }
}
