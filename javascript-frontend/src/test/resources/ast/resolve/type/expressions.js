var par1 = (function(){})
var par2 = (1, 2, 3)

var o1 = new String("");
var o2 = new Boolean(true);
var o3 = new Number(1);

var o4 = new Foo();

var o5 = new Function('a', 'b', 'return a + b');
var o6 = new Function;

var o7 = new Date();

var num = 5, str = "str", bool = true;

var exp1 = num + 1; // NUMBER
var exp2 = num + str; // STRING
var exp3 = (num + exp1)/exp2; // NUMBER
var exp4 = unknown > exp1;    // BOOLEAN

var exp5 = num + unknown; // UNKNOWN
var exp6 = unknown1 - unknown2; // NUMBER

var counter1 = 0;     // NUMBER

var obj = {prop1: "value1", prop2: "value2"};
for (counter1 in obj) {  // counter UNKNOWN
  foo(obj[counter1]);
}

var obj = {prop1: "value1", prop2: "value2"};
for (var counter2 of obj) {  // counter UNKNOWN
  foo(counter2);
}


var charAt = str.charAt(1);  // STRING
var charCodeAt = str.charCodeAt(1);  // NUMBER
var concat = str.concat("abc");  // STRING
var indexOf = str.indexOf("abc");  // NUMBER
var lastIndexOf = str.lastIndexOf("abc");  // NUMBER
var localeCompare = str.localeCompare("abc");  // NUMBER
var replace = str.replace("abc", "d");  // STRING
var search = str.search("abc");  // NUMBER
var slice = str.slice(1, 3);  // STRING
var split = str.split(" ");  // ARRAY
var substr = str.substr(1, 3);  // STRING
var substring = str.substring(" ");  // STRING
var toLocaleLowerCase = str.toLocaleLowerCase(" ");  // STRING
var toLocaleUpperCase = str.toLocaleUpperCase(" ");  // STRING
var toLowerCase = str.toLowerCase(" ");  // STRING
var toString = str.toString(" ");  // STRING
var toUpperCase = str.toUpperCase(" ");  // STRING
var trim = str.trim(" ");  // STRING
var valueOf = str.valueOf(" ");  // STRING


var prefixInc = ++unknown;  // NUMBER
var postfixInc = unknown++;  // NUMBER
var prefixDec = --unknown;  // NUMBER
var postfixDec = unknown--;  // NUMBER
var unaryPlus = +unknown;  // NUMBER
var unaryMinus = -unknown;  // NUMBER
var bitwiseCompliment = ~unknown;  // NUMBER
var logicalCompliment = !unknown;  // BOOLEAN
var typeofExpr = typeof unknown; // STRING
var deleteExpr = delete unknown; // BOOLEAN

function foo(par = 42) {
  par = "str";  // "par" is only string, as default value is ignored
}
