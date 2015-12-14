var str = "42";
var num = 1;


foo(1 + str);   // Noncompliant {{Either make this concatenation explicit or cast "str" operand to a number.}}
foo(str + 1);   // Noncompliant {{Either make this concatenation explicit or cast "str" operand to a number.}}
foo(num + str);   // Noncompliant
foo(str + num);   // Noncompliant
foo(new A() + str);   // Noncompliant
foo(true + str);   // Noncompliant [[sc=10;ec=11;el=+0;secondary=+0,+0]]


// We are ignoring cases when string literal is used (what ever string value is) or string operand is expression
foo("42" + 1);   // Compliant
foo(1 + "42");   // Compliant
foo("42" + num);   // Compliant
foo(num + "42");   // Compliant
foo(num * 5 + (str + "")); // Compliant: it's unlikely that string operand is calculated and addition is intended
foo(num * 5 + str); // Noncompliant


// cast string operand to number
foo(num + Number(str));   // Compliant
foo(num + parseInt(str));   // Compliant


// cast non-string operand to string
foo('' + num + str);   // Compliant
foo(num.toString() + str);   // Compliant
foo(`${num}${str}`);


function bar1(str) {
  foo(1 + str);  // Noncompliant
}
bar1("42");


function bar2(num) {
  var localStr = "42";
  foo(num + localStr);  // Noncompliant
}
bar2(1);


function bar3(num, str) {
  foo(num + str);  // Noncompliant
}
bar3(1, "42");


function bar4(p1, p2) {
  foo(p1 + p2);  // Compliant, not sure about parameter type, kind of false negative
}
bar4(1, "42");
bar4("42", "42");


var obj = {
  num : 1,
  str : "42"
}
foo(obj + str);     // Noncompliant
foo(obj.num + str); // Compliant, false-negative
foo(obj.str + str); // Compliant


var strObj1 = new String("42");
foo(1 + strObj1); // Noncompliant

