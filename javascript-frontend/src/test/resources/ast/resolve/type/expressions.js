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
