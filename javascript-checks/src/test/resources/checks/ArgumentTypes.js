function foo() {
  var str = "str";
  str.charAt(5); // OK
  str.charAt(unknown); // OK
  str.charAt("5"); // Noncompliant {{Change this argument to the documented type: Number.}}
//           ^^^

  str.concat("1", "2", "3", 1 + 2);  // Noncompliant {{Change this argument to the documented type: String.}}
//                          ^^^^^

  str.replace(1,  // Noncompliant {{Change this argument to the documented type: String or RegExp.}}
              1); // Noncompliant {{Change this argument to the documented type: String or Function.}}

  str.replace("str", function(){});

  Math.abs("42"); // Noncompliant

  str.hasOwnProperty(1); // OK

  var x = "5";
  if (unknown()) {
    x = 5;
  }
  str.charAt(x); // OK, one path has right type

  var x = [1, 2];
  if (unknown()) {
    x = "6";
  }
  str.charAt(x); // Noncompliant

  str.toString();
  foo.unknown();
  unknown();

  Object.create(null); // OK
  [1, 2].reduce(function(){}, []); // OK
  str.split(new RegExp()); // OK
}
