var JSON = 5;  // Noncompliant {{Remove this override of "JSON".}}

new Promise(); // OK

Set = "str";   // Noncompliant

for (Math in arr){};   // Noncompliant [[sc=6;ec=10]]

function fun(Reflect){};  // Noncompliant

var obj = new Object();

JSON++;
