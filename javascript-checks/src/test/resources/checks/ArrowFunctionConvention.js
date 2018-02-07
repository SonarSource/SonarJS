// PARAMETERS
var foo = (a /*some comment*/) => { foo(); }
var foo = (a, b) => { foo(); }
var foo = () => { foo(); }
var foo = (a) => { foo(); }     // Noncompliant {{Remove parentheses around the parameter of this arrow function.}}
var foo = (a = 1) => { foo(); }
var foo = a => { foo(); }

// BODY

var foo = (a, b) => { foo(); }
var foo = (a, b) => { return; }
var foo = (a, b) => { }
var foo = (a, b) => { return a; }    // Noncompliant [[sc=21;ec=34]] {{Remove curly braces and "return" from this arrow function body.}}
var foo = (a, b) => { foo(); return a;}
var foo = (a, b) => a + b;
var foo = (a, b) => foo(a, b);
var foo = (a, b) => a;
var foo = (a, b) => { return {}; }  // OK, can't shorthand object literal
var foo = (a, b) => {   // OK, ignore multiline return
  return Foo()
    .Bar();
}
