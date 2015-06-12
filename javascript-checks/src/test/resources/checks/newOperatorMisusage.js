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
new numeric;   // NOK
new boolean;   // NOK
new string;    // NOK

/**
 * Non-function object
 */
new object;    // NOK
new array;     // NOK

/**
 * Non-documented function
 */
new MyClass1;  // OK
new MyClass2;  // OK


/**
 * Documented function with tag @constructor
 */
new MyClassA;  // OK - JSDoc @constructor
new MyClassB;  // OK - JSDoc but not handle by the check
new MyClassC;  // OK - JSDoc @class

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
