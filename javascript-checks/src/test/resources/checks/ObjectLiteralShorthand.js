let a = 1;

let myObj = {
  a : a,  // Noncompliant {{Use shorthand for property "a".}} [[sc=3;ec=4]]
  b,
  fun: function () {  // Noncompliant {{Use shorthand for method "fun".}} [[sc=3;ec=6]]
    //...
  },
  foo() {
  },
  get prop() {
  }
}
