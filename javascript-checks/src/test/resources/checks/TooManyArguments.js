function foo1(p1, p2){}

foo1(1, 2, 3);  // NOK

function foo2(){
  foo1(1, 2, 3, 4);  // NOK
  foo1(1, 2);
  foo1(1);

  var foo3 = function(){}

  foo3(1)  // NOK
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

foo7(1, 2); // NOK

(function(p1, p2){
  doSomething1();
  doSomething2();
})(1, 2, 3);     // NOK

x=function(a,b){
  return a + b;
}(1,2,3);
