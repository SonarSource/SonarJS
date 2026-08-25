function f() {
    try {
        doSomething();
    } catch (err) {

    } // Compliant: try guards a single simple statement
}

function g() {
    try {
        if (condition) {
            doSomething();
        }
    } catch (err) {

    } // Compliant: try guards a single simple statement
}

function h() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
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
    } catch (err) {

    } // Compliant: try guards a single simple statement
}

function variableDeclarationBody() {
    try {
        const parsed = JSON.parse(raw);
    } catch (err) {

    } // Compliant: try guards a single simple statement
}

function throwBody() {
    try {
        throw new Error("boom");
    } catch (err) {

    } // Compliant: try guards a single simple statement
}

function nestedTryBody() {
    try {
        try {
            doSomething();
        } catch (inner) {
            handle(inner);
        }
    } catch (err) {

    } // Compliant: try guards a single simple statement
}

function emptyTryBody() {
    try {
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function forLoopBody() {
    try {
        for (const x of xs) {
            doSomething(x);
            doSomethingElse(x);
        }
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function whileLoopBody() {
    try {
        while (condition()) {
            doSomething();
        }
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function switchBody() {
    try {
        switch (kind) {
            case 'a': stepOne(); stepTwo(); break;
            default: fallback();
        }
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function blockBody() {
    try {
        {
            doSomething();
            doSomethingElse();
        }
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function labeledLoopBody() {
    try {
        outer: for (const x of xs) {
            doSomething(x);
        }
    } catch (err) {

    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function commentOnlySingleLine() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) {
        // ignored on purpose
    } // Compliant
}

function commentAndCodeSingleLine() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) { // Noncompliant {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
        // does not use err
        doCleanup();
    }
}

function blockCommentOnlySingleLine() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) {
        /* ignored on purpose */
    } // Compliant
}

function commentOnlySameLine() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) { // documented
    }
}

function blockCommentOnlySameLine() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) { /* documented */ }
}

function noBindingCatch() {
    try {
        doSomething();
        return 0;
    } catch {
        return -1;
    } // Compliant, no exception parameter is declared
}

function destructuredParamCatch() {
    try {
        doSomething();
        doSomethingElse();
    } catch ({ message }) {
    } // Compliant, catch clause parameter is not a simple identifier
}

function pragmaOnlyCatch() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) {
        // eslint-disable-next-line no-empty
    } // Compliant: comment content is not inspected beyond being non-empty
}

function emptyCommentCatch() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) {
        //
    } // Noncompliant@-2 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}

function emptyStatementWithComment() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) { // Noncompliant {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
        ; // c
    }
}

function commentBetweenParamAndBody() {
    try {
        doSomething();
        doSomethingElse();
    } catch (err) /* c */ {
    } // Noncompliant@-1 {{Handle this exception, don't catch it at all, or explain in a comment why it is ignored.}}
}
