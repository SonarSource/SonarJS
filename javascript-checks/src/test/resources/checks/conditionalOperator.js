function sayHello() {
  var a = (a === 'a') ? 'is a' : 'is not a'; // Noncompliant {{Convert this usage of the ternary operator to an "if"/"else" structure.}}
//                    ^
}
