console.log("hello " + name);  // OK
console.log("hello " + name + "!" + "!");  // OK
console.log("hello " + name + "!");  // Noncompliant
console.log("hello " + name + "!!!");  // Noncompliant
console.log("hello " + name + "!!!!");  // Noncompliant {{Convert this concatenation to the use of a template.}}

var x = 1 + 2 + foo("hello " + name + "!!!!");  // Noncompliant
var x = 1 + foo("hello " + name + "!!!!") + 2;  // Noncompliant
var x = foo("hello " + name + "!!!!") + 1 + 2;  // Noncompliant

var x = "hello " + name + "!!!!" + "hello " + name + "!!!!"; // Noncompliant [[sc=9;ec=60]]

var str = "str";
var x = str + str + str; // Ok, no string literal

var x = name + "fooo" + name; // OK
var x = `Template literal ${foo}` + name + name; // OK
var x = `Template literal ${foo}` + name + "fooo"; // Noncompliant

var x = y == "aaaa" + b + "cccc"; // Noncompliant
var x = "aaaa" + b + "cccc" == y; // Noncompliant

var x = a + b + c + d + e + "aaaa" + "bbbb";
var x = a + "aaaaa" + b;
