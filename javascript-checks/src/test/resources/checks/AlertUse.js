alert("bla");                           // NOK

obj.alert("bla");                       // OK
new alert();                            // OK
var a = function alert() {return 1;};   // OK
