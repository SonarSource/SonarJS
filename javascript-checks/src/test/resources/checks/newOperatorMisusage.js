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

var Number = 1;
var Boolean = true;
var String = "str";
var Object = { a:1 };
var Array = [1, 2, 3];



/**
 * Primitives
 */
new Number;    // NOK
new Boolean;   // NOK
new String;    // NOK

/**
 * Non-function object
 */
new Object;    // NOK
new Array;     // NOK

/**
 * Non-documented function
 */
new MyClass1;  // OK
new MyClass2;  // OK


/**
 * Documented function with tag @constructor
 */
new MyClassA;  // OK - JSDoc
new MyClassB;  // OK - JSDoc


/**
 * Exclude when has UNKNOWN type
 */

function unknownFunction() {
}

var unknownVariable = 1;

unknownFunction = unknownVariable;
unknownVariable = unknownFunction;

new unknownFunction();   // OK
new unknownVariable;     // OK

/**
 * Exclude when can be a function
 */
function f() {
}

f = 1;

new f;  // OK


/**
 *  Exclude when no type
 */
new UnknownObject;
