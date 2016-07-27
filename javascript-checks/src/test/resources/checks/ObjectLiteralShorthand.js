let a = 1;

let myObj = {
  a : a,  // Noncompliant [[sc=3;ec=4]] {{Use shorthand for property "a".}}
  b,
  fun: function () {  // Noncompliant [[sc=3;ec=6]] {{Use shorthand for method "fun".}}
    //...
  },
  foo() {
  },
  get prop() {
  }
}
