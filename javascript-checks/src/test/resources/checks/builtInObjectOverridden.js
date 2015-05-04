var JSON = 5;  // NOK

new Promise(); // OK

Set = "str";   // NOK

for (Math in arr){};   // NOK

function fun(Reflect){};  // NOK

var obj = new Object();

JSON++;
