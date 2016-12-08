import importedFunc from "moduleName";

function test(domStyle) {

  domStyle.set(iframe, "opacity", 0.1);

  importedFunc();

  this.foo.bar();

  var x;

  x(); // Noncompliant {{This expression might have a value which cannot be called; it is not a function.}}
//^

  function foo(){}
  foo();

  var func = function() {}
  func();

  func = a => 1;
  func();

  class A{}
  var obj = new A();
  A(); // Noncompliant

  var B = class {}
  obj = new B();
  B(); // Noncompliant

  foo.bar();
}

function several_execution_paths() {

  var func1;

  if (condition) {
    func1 = function(){}
  }

  func1(); // Noncompliant

  var func2;

  if (condition) {
    func2 = 4;
  }

  func2(); // Noncompliant
}

function objLiteral (foo) {
  foo({
    pathname: '/home',
    query: { the: 'query' }
  })
}

