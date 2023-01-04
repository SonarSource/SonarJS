var implements; // NOK

implements = 42; // ok, usage
var implements; // ok, second declaration

var interface; // NOK
var public = 42; // NOK
function foo(static) {} // NOK
var await; // NOK
function yield() { // NOK
  var extends; // NOK
}
