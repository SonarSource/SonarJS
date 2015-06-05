function foo1(p1, p2){}

foo1(1, 2, 3);  // NOK

function foo2(){
  foo1(1, 2, 3, 4);  // NOK
  foo1(1, 2);
  foo1(1);

  var foo3 = function(){}

  foo3(1)
}

function foo4(){
  console.log(arguments)
}

foo4(1, 2) // OK, "arguments" is used

var obj = {
  foo1 : function(p1, p2){}
}

obj.foo1(1, 2, 3) // Compliant - False Negative - object properties are not covered yet

