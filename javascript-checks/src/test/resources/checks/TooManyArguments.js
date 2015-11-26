function foo1(p1, p2){}

foo1(1, 2, 3);  // Noncompliant [[sc=5;ec=14;el=+0;secondary=-2]] {{"foo1" expects "2" arguments, but "3" were provided.}}

function foo2(){
  foo1(1, 2, 3, 4);  // Noncompliant {{"foo1" expects "2" arguments, but "4" were provided.}}
  foo1(1, 2);
  foo1(1);

  var foo3 = function(){}

  foo3(1)  // Noncompliant {{"foo3" expects "0" arguments, but "1" were provided.}}
}

function foo4(){
  console.log(arguments)
}

foo4(1, 2) // OK, "arguments" is used

var obj = {
  foo1 : function(p1, p2){}
}

obj.foo1(1, 2, 3) // Compliant - False Negative - object properties are not covered yet



//  ELLIPSIS (Rest Parameter)

function foo5(par1, ... par2){}

foo5(1, 2, 3, 4)  // OK


 var foo6 = function(...p1){}
 foo6(1, 2) // OK


// parameter with "arguments" name

function foo7(arguments){
  console.log(arguments)
}

foo7(1, 2); // Noncompliant {{"foo7" expects "1" arguments, but "2" were provided.}}

(function(p1, p2){
  doSomething1();
  doSomething2();
})(1, 2, 3);     // Noncompliant {{This function expects "2" arguments, but "3" were provided.}}

x=function(a,b){
  return a + b;
}(1,2,3);       // Noncompliant
