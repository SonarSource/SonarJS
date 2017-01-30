var sym = Symbol("foo");               // OK

var sym = new                          // Noncompliant [[ID=1]]{{Remove this "new" operator.}}
//        ^^^
              Symbol("foo");
//S           ^^^^^^ 1

function foo1(Symbol) {
  var bar = new Symbol("bar");         // OK
}

(function(Symbol) {
  function bar() {
    var baz = new Symbol("baz");       // OK
  }
})(10);

class A {
  bar(Symbol) {
    var baz = new Symbol("baz");       // OK
  }
}

function foo2(Symbol) {
  (s => new Symbol("baz"));            // OK
}

function foo(other) {
  var bar = new Symbol("bar");         // Noncompliant
}

var SymbolAlias = Symbol;
var sym = new SymbolAlias("foo");      // FN
