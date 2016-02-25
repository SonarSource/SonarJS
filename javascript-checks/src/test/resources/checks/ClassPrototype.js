function Foo() {
}

Foo.prototype.doSomething = function () {  // Noncompliant {{Declare a "Foo" class and move this declaration of "doSomething" into it.}}
  // ...
}

function bar(){
}
Foo.prototype.doSomethingElse = bar; // Noncompliant [[sc=1;ec=30]]

Foo.prototype.property = 1; // Ok, it's not a method


Bar.prototype.doSomethingElse = bar; // Ok, we don't know what is Bar
