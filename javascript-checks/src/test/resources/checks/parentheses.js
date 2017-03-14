function sayHello() {
  var a = typeof ((37)); // Noncompliant {{Remove those useless parentheses.}}
//               ^^^^^^

  var b = typeof (38);

  var b = typeof 39;

}
