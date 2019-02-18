function multiply(a = 1, b) {  // Noncompliant {{Move parameter "a" after parameters without default value.}}
  return a*b;
}

var foo = function(p1 = 1, p2 = 2, p3, p4 = 4) { // Noncompliant {{Move parameters "p1", "p2", "p4" after parameters without default value.}}
};

class A {
  foo(p1 = 1, p2, p3  = 3) {  // Noncompliant [[sc=7;ec=9;secondary=+0]]
  }
}

foo((p1 = 1, p2) => {   // Noncompliant [[sc=6;ec=8]]
});

function foo({a, b} = {a:42, b:"hello"}, p1){ // Noncompliant {{Move parameter "{a, b}" after parameters without default value.}}
}

function foo() {
}

// OK for functions with rest parameter
function foo(p1 = 1, ...restArgs) {
}

function foo(p1 = 1, p2, ...restArgs) {
}

function foo(p1, p2, p3 = 1, p4 = 2) {  // OK
}
