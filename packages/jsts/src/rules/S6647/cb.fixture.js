class Foo {
  constructor(){
    doSomething();
  }
}

class Invalid1 {
  constructor(){} // Noncompliant [[qf]] {{Useless constructor.}}
}
// edit@qf [[sc=2;ec=17]] {{}}

class Invalid2 extends Bar {
  constructor(){ // Noncompliant
    super();
  }
}

