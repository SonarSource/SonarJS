class Foo {
  constructor(){
    doSomething();
  }
}

class Invalid1 {
  constructor(){} // Noncompliant [[qf]] {{Useless constructor.}}
}
// fix@qf {{Remove constructor}}
// edit@qf [[sc=2;ec=17]] {{}}

class Invalid2 extends Bar {
// Noncompliant@+5 [[qf1]] {{Useless constructor.}}
// fix@qf1 {{Remove constructor}}
// edit@qf1 [[sc=2;ec=17]] {{}}
// del@qf1@+1
// del@qf1@+1
  constructor(){
    super();
  }
}

