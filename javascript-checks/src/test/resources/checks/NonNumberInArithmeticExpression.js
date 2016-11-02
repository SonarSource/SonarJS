function plus() {
  var str = "";
  var bool = true;
  var obj = new Foo();
  var unknown = foo();
  var num = 42;
  var d1 = new Date(), d2 = new Date();

  // PLUS -> concatenation
  str + unknown;
  str + num;
  str + obj;
  str + d1;
  d1 + d2;
  str += unknown; str = "";
  unknown += str; unknown = foo();
  bool + unknown; // OK, unknown might be a string

  // PLUS -> addition
  num + num;
  num += num; num = 42;
    num
//S ^^^ 1
    +
//S ^ 1
  bool; // Noncompliant [[id=1]] {{Convert this operand into a number.}}
//^^^^
  bool += num; bool = true; // Noncompliant
  num += bool; // Noncompliant

  // COMPARISON -> lexicographical
  str < str; str > str; str <= str; str >= str;
  str > obj;
  str < unknown; // OK, unknown might be a string

  // COMPARISON -> numeric
  str < num; // Noncompliant
  str > bool;// Noncompliant
  bool < num; // Noncompliant

  // DATES
  d1 - d2; // OK
  d1 - unknown; // OK
  d1 - num;// Noncompliant
  d1 + d2; // OK, concatenation
  d1 + bool; // OK, concatenation

  d1   // Noncompliant
//^^
  / d2; // Noncompliant
//  ^^
// Noncompliant@+1
  d1 * d2; // Noncompliant
// Noncompliant@+1
  d1 *= d2; d1 = new Date(); // Noncompliant
// Noncompliant@+1
  d1 -= d2; d1 = new Date(); // Noncompliant
  num += d1; num = 42; // Noncompliant
  num *= d1; num = 42;// Noncompliant
  d1 *= num; d1 = new Date();// Noncompliant
  d1 < d2; // OK

  // UNARY OPERATIONS
  str++; str = ""; // Noncompliant
  str--; str = ""; // Noncompliant
  -str; // Noncompliant
  -bool; // Noncompliant
  -d1; // Noncompliant
  d1++; d1 = new Date(); // Noncompliant
  --d1; d1 = new Date(); // Noncompliant
  obj++; obj = new Foo();
  -obj;

  // ARITHMETIC OPERATIONS
  num * num;
  bool * num; // Noncompliant
// Noncompliant@+1
  bool * str; // Noncompliant
  num * str; // Noncompliant
  bool * unknown; // Noncompliant
  str * unknown; // Noncompliant
  d1 * unknown; // Noncompliant

  str / num; // Noncompliant
  str % num; // Noncompliant
  str - num; // Noncompliant
  str -= num; str = ""; // Noncompliant
  str *= num; str = ""; // Noncompliant
  str /= num; str = ""; // Noncompliant
  str %= num; str = ""; // Noncompliant

  str || bool;
}

function one_issue_per_expression() {
  var str = "42";
  var x;

  if (condition()) {
    x = 42;
  }

  str - 4;  // Noncompliant
  foo(x);
}

function primitive_wrappers(x) {
  -new String(x); // Noncompliant
  -new Boolean(x); // Noncompliant
  42 / new String(x); // Noncompliant
  42 / new Boolean(x); // Noncompliant
  42 + new String(x); // ok
  42 + new Boolean(x); // Noncompliant
  new Number(x) + true; // Noncompliant
  true + new Number(x); // Noncompliant
  new Number(x) > "42"; // Noncompliant
  "42" > new Number(x); // Noncompliant
}