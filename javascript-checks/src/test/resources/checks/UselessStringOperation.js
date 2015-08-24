var var1 = "abc".toUpperCase(); // OK
unknown.toUpperCase(); // OK
var str = "abcd"; 
str.toUpperCase(); // NOK
"abc".toUpperCase(); // NOK
str.substring(1,2); // NOK

var x = "abc";
x = something();
x.toUpperCase(); // OK
