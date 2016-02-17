let a = 1;

let myObj = {
  a : a,  // Noncompliant {{Use shorthand for property "a".}}
  b,
  fun: function () {  // Noncompliant {{Use shorthand for method "fun".}}
    //...
  },
  foo() {
  },
  get prop() {
  }
}
