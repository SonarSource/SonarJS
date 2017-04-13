function main() {
  foo(); // PS arguments=OBJECT

  var b = Boolean, n = Number, s = String, f = Function;
  foo(); // PS b=FUNCTION & n=FUNCTION & s=FUNCTION & f=FUNCTION

  var objB = new Boolean();
  foo(); // PS objB=BOOLEAN_OBJECT

  var date = new Date();
  foo(); // PS date=DATE

  date = Date();
  n = Number();
  f = Function();
  foo(); // PS date=STRING & n=NUMBER & f=FUNCTION

  var date1 = Date.now();
  foo(); // PS date1=NUMBER

  var dateName = Date.name;
  foo(); // PS dateName=STRING

  var dateHasOwnProperty = Date.hasOwnProperty();
  foo(); // PS dateHasOwnProperty=BOOLEAN

  var obj = Object.create(null);
  foo(); // PS obj=OBJECT

  var unknown = Object.fooBar;
  foo(); // PS unknown=ANY_VALUE

  var maxNum = Number.MAX_VALUE;
  var isNanMethod = Number.isNaN(unknown);
  var toFixed = n.toFixed();
  foo(); // PS maxNum=TRUTHY_NUMBER & isNanMethod=BOOLEAN & toFixed=TRUTHY_STRING

  var mathAbs = Math.abs(-4);
  var squareRoot = Math.SQRT2;
  unknown = mathAbs.fooBar;
  foo(); // PS mathAbs=NUMBER & squareRoot=TRUTHY_NUMBER & unknown=ANY_VALUE

  var regexp = new RegExp();
  var regexpProp = regexp.lastIndex;
  var regexpMethod = regexp.test();
  unknown = RegExp.fooBar;
  foo(); // PS regexp=REGEXP & regexpProp=NUMBER & regexpMethod=BOOLEAN & unknown=ANY_VALUE

  // -------  METHOD BEHAVIOUR  -------
  var isArray = false;

  isArray = false;
  if (Array.isArray(1)) {
    isArray = true;
  }
  foo(isArray); // PS isArray=FALSE

  isArray = false;
  if (Array.isArray("[1, 2]")) {
    isArray = true;
  }
  foo(isArray); // PS isArray=FALSE

  isArray = false;
  if (Array.isArray()) {
    isArray = true;
  }
  foo(isArray); // PS isArray=FALSE

  isArray = false;
  if (Array.isArray(null)) {
    isArray = true;
  }
  foo(isArray); // PS isArray=FALSE

  isArray = false;
  if (Array.isArray([1, 2])) {
    isArray = true;
  }
  foo(isArray); // PS isArray=TRUE

  isArray = false;
  var unknown = foo();
  if (Array.isArray(unknown)) {
    isArray = true;
  }
  foo(isArray); // PS isArray=TRUE || isArray=FALSE


  var isNanVar;
  isNanVar = false;
  if (Number.isNaN(unknown)) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE || isNanVar=FALSE

  isNanVar = false;
  if (Number.isNaN(1)) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=FALSE

  isNanVar = false;
  if (Number.isNaN(NaN)) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE

  isNanVar = false;
  if (Number.isNaN()) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=FALSE

  var unknownValue = foo();
  if (Number.isNaN(unknownValue)) {
    foo(unknownValue); // PS unknownValue=NAN
  }

  isNanVar = false;
  if (isNaN(unknown)) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE || isNanVar=FALSE

  isNanVar = false;
  if (isNaN(1)) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=FALSE

  isNanVar = false;
  if (isNaN(NaN)) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE

  isNanVar = false;
  if (isNaN()) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE

  isNanVar = false;
  if (isNaN(new Function())) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE

  isNanVar = false;
  if (isNaN("hello")) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE || isNanVar=FALSE

  isNanVar = false;
  if (isNaN(new Date(unknown))) {
    isNanVar = true;
  }
  foo(isNanVar); // PS isNanVar=TRUE || isNanVar=FALSE

  var unknownValue = foo() ? null : undefined;
  if (isNaN(unknownValue)) {
    foo(unknownValue); // PS unknownValue=UNDEFINED
  }
  
  var x = Function.prototype.bind.toString();
  foo(x); // PS x=STRING
}
