eval = 42;
arguments++;
++eval;
var obj = { set p(arguments) { } };
var eval;
try { } catch (arguments) { }
function x(eval) { }
function arguments() { }
var y = function eval() { };
var f = new Function("arguments", "return 17;");

eval("");
arguments[0];

fun(arguments); // OK

function fun() {
  var a = arguments.length == 0; // OK
  var b = arguments.length === 0; // OK
  var c = (arguments = 0) == 0; // NOK
}
