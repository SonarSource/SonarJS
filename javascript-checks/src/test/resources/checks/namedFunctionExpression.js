f = function fun(){};  // Noncompliant {{Make this function anonymous by removing its name: 'function() {...}'.}}
new function fun(){}; // Noncompliant [[sc=14;ec=17]]
(function fun(){}); // Noncompliant

f = function(){}; // function expression
new function(){}; // function expression
(function(){}); // function expression

function fun(){} // function declaration
