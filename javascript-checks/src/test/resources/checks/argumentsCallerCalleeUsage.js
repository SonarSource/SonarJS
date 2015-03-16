var a = arguments.callee;   // NOK
var b = arguments.caller;   // NOK

var c = arguments.bugspot;  // OK
var c = myObject.caller;    // OK
var c = myObject.callee;    // OK
