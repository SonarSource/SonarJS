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

function foo() {
    var a = arguments.length == 0;
    var b = arguments.length === 0;
    return true;
}
