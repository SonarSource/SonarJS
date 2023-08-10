function assign() {
    Object.prototype.p = 0; // Noncompliant
//  ^^^^^^^^^^^^^^^^^^
}

function call() {
    Object.defineProperty(Array.prototype, 'p', {value: 0}); // Noncompliant
//                        ^^^^^^^^^^^^^^^
}
