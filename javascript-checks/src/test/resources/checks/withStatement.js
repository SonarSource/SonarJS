function sayHello() {
  with (foo) { // Noncompliant {{Remove this use of "with".}}
//^^^^
    var x = 3;
    return x;
  }
}
