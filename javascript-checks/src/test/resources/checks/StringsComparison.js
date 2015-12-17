function foo() {
  var str1 = '42';
  var str2 = '24';
  var num = 5;

  foo(str1 < str2); // Noncompliant {{Convert operands of this use of "<" to number type.}}
  foo(str1 > str2); // Noncompliant [[sc=12;ec=13;secondary=+0,+0]]
  foo(str1 <= str2); // Noncompliant
  foo(str1 >= str2); // Noncompliant

  foo(str1 > num);
  foo(num <= str2);

}