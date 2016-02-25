var var1 = "abc".toUpperCase(); // OK
unknown.toUpperCase(); // OK
var str = "abcd"; 
str.toUpperCase(); // Noncompliant {{str is an immutable object; you must either store or return the result of the operation.}}
"abc".toUpperCase(); // Noncompliant {{"abc" is an immutable object; you must either store or return the result of the operation.}}
str.substring(1,2); // Noncompliant

var x = "abc";
x = something();
x.toUpperCase(); // OK

str.replace("oldsubstr", "newsubstr");  // Noncompliant
str.replace("oldsubstr", str);  // Noncompliant

function foo(){}
str.replace("oldsubstr", foo);
str.replace("oldsubstr", unknown);
str.replace("oldsubstr", function() {});

"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam".toUpperCase();  // Noncompliant {{String is an immutable object; you must either store or return the result of the operation.}}
