function assign() {
    Object.prototype.p = 0; // Noncompliant {{Object prototype is read only, properties should not be added.}}
//  ^^^^^^^^^^^^^^^^^^
}

function call() {
    Object.defineProperty(Array.prototype, 'p', {value: 0}); // Noncompliant {{Array prototype is read only, properties should not be added.}}
//                        ^^^^^^^^^^^^^^^
}
