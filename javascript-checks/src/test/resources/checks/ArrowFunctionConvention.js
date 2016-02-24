// PARAMETERS

var foo = (a, b) => { foo(); }
var foo = () => { foo(); }
var foo = (a) => { foo(); }     // Noncompliant {{Remove parentheses around the parameter of this arrow function.}}
var foo = (a = 1) => { foo(); }
var foo = a => { foo(); }

// BODY

var foo = (a, b) => { foo(); }
var foo = (a, b) => { return; }
var foo = (a, b) => { }
var foo = (a, b) => { return a; }    // Noncompliant {{Remove curly braces and "return" from this arrow function body.}} [[sc=21;ec=34]]
var foo = (a, b) => { foo(); return a;}
var foo = (a, b) => a + b;
var foo = (a, b) => foo(a, b);
var foo = (a, b) => a;
var foo = (a, b) => { return {}; }  // OK, can't shorthand object literal
