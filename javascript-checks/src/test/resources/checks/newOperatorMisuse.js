function MyClass1 () {
}

var MyClass2 = function () {
};

/**
 * @constructor
 */
function MyClassA () {
}

/**
 * @constructor
 */
var MyClassB = function () {
};

/**
 * @class
 */
var MyClassC = function () {
};

var numeric = 1;
var boolean = true;
var string = "str";
var object = { a:1 };
var array = [1, 2, 3];



/**
 * Primitives
 */
new numeric;   // Noncompliant [[secondary=+0]] {{Replace numeric with a constructor function.}}
//  ^^^^^^^
new boolean;   // Noncompliant
new string;    // Noncompliant

/**
 * Non-callable objects
 */
new object;    // Noncompliant
new array;     // Noncompliant

/**
 * Non-documented function
 */
new MyClass1;  // Noncompliant
new MyClass2;  // Noncompliant


/**
 * Documented function with tag @constructor
 */
new MyClassA;  // OK - JSDoc @constructor
new MyClassB;  // Noncompliant FP - JSDoc but not handled by the check
new MyClassC;  // Noncompliant - JSDoc @class

/**
 * Exclude when has UNKNOWN type
 */

function unknownFunction() {
}

var unknownVariable = 1;

unknownFunction = getSomething();
unknownVariable = getSomething();

new unknownFunction();   // OK
new unknownVariable;     // OK

/**
 * Exclude when has more than just function type
 */
function f() {
}

f = 1;

new f;  // OK


/**
 *  Exclude when no type
 */
new UnknownObject;


var NodeList = function(array){}

function queryForEngine(engine, NodeList){
  return new NodeList([]);
}

queryForEngine(1, NodeList)

queryForEngine(defaultEngine, function(array){
});

var A = function() { return function(){}}
var B = new A();  // Noncompliant
var C = new B();  // OK

new function(){ return 5; }; // Noncompliant [[secondary=+0]] {{Replace this function with a constructor function.}}
//  ^^^^^^^^
new (function(){ return 5; }); // Noncompliant {{Replace this function with a constructor function.}}
//   ^^^^^^^^

class MyClass {
}

var myObj = new MyClass();
