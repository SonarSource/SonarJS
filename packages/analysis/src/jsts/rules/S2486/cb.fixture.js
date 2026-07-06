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

function assignmentBody() {
    try {
        n = String(name || "");
    } catch (err) { // Compliant

    }
}

function variableDeclarationBody() {
    try {
        const parsed = JSON.parse(raw);
    } catch (err) { // Compliant

    }
}

function throwBody() {
    try {
        throw new Error("boom");
    } catch (err) { // Compliant

    }
}

function nestedTryBody() {
    try {
        try {
            doSomething();
        } catch (inner) {
            handle(inner);
        }
    } catch (err) { // Compliant

    }
}

function emptyTryBody() {
    try {
    } catch (err) { // Noncompliant {{Handle this exception or don't catch it at all.}}

    }
}

function forLoopBody() {
    try {
        for (const x of xs) {
            doSomething(x);
            doSomethingElse(x);
        }
    } catch (err) { // Noncompliant {{Handle this exception or don't catch it at all.}}

    }
}

function whileLoopBody() {
    try {
        while (condition()) {
            doSomething();
        }
    } catch (err) { // Noncompliant {{Handle this exception or don't catch it at all.}}

    }
}

function switchBody() {
    try {
        switch (kind) {
            case 'a': stepOne(); stepTwo(); break;
            default: fallback();
        }
    } catch (err) { // Noncompliant {{Handle this exception or don't catch it at all.}}

    }
}
