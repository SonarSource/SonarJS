console.log("hello " + name);  // OK
console.log("hello " + name + "!");  // Noncompliant {{Convert this concatenation to the use of a template.}}

var x = 1 + 2 + foo("hello " + name + "!");  // Noncompliant
var x = 1 + foo("hello " + name + "!") + 2;  // Noncompliant
var x = foo("hello " + name + "!") + 1 + 2;  // Noncompliant

var x = "hello " + name + "!" + "hello " + name + "!"; // Noncompliant [[sc=9;ec=24;secondary=+0,+0,+0,+0]]

var str = "str";
var x = str + str + str; // Ok, no string literal

var x = `Template literal ${foo}` + name + name; // Noncompliant

var x = y == "a" + b + "c"; // Noncompliant
var x = "a" + b + "c" == y; // Noncompliant
