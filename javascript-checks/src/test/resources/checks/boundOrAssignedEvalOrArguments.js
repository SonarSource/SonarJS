eval = 42;
arguments++;
++eval;
var obj = { set p(arguments) { } }; // NOK
var obj = { set p(arg) { } };       // OK
var eval;
try { } catch (arguments) { }
function x(eval) { }
function arguments() { }
var y = function eval() { };
var f = new Function("arguments", "return 17;");

eval("");
arguments[0] = a;  // OK
a = arguments;     // OK

fun(arguments); // OK

function fun() {
  var a = arguments.length == 0; // OK
  var b = arguments.length === 0; // OK
  var c = (arguments = 0) == 0; // NOK
}

function fun(...eval) { // NOK
}

function fun(arguments, ...a) { // NOK
}

var f = function(eval) {  // NOK
}

function fun(a) {  // OK
}

function fun(yield) {  // OK
}

/**
 * Destructuring patern in declaration
 */
function fun ({eval}) {     // NOK
 var {arguments, } = eval;  // NOK
}

/**
 * Generator function
 */
function* fun(eval) { // NOK
}
