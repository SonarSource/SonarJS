function f() {
    try {
        doSomething();
    } catch (err) { // Compliant

    }
}

function g() {
    try {
        if (condition) {
            doSomething();
        }
    } catch (err) { // Compliant

    }
}

function h() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) { // Noncompliant {{Handle this exception or don't catch it at all.}}

    }
}

function i() {
    try {
        doSomething();
    } catch (err) { // Compliant
        console.log(`Exception while doing something: ${err}`);
    }
}
