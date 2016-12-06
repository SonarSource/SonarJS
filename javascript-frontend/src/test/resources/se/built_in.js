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
  var isNanMethod = Number.isNaN();
  var toFixed = n.toFixed();
  foo(); // PS maxNum=TRUTHY_NUMBER & isNanMethod=BOOLEAN & toFixed=TRUTHY_STRING

  var mathAbs = Math.abs(-4);
  var squareRoot = Math.SQRT2;
  foo(); // PS mathAbs=NUMBER & squareRoot=TRUTHY_NUMBER

  var regexp = new RegExp();
  var regexpProp = regexp.lastIndex;
  var regexpMethod = regexp.test();
  unknown = RegExp.fooBar;
  foo(); // PS regexp=REGEXP & regexpProp=NUMBER & regexpMethod=BOOLEAN & unknown=ANY_VALUE

  // -------  METHOD BEHAVIOUR  -------
  var isArray;
  isArray = Array.isArray(unknown);
  foo(isArray); // PS isArray=BOOLEAN

  isArray = Array.isArray(1);
  foo(isArray); // PS isArray=FALSE

  isArray = Array.isArray("[1, 2]");
  foo(isArray); // PS isArray=FALSE

  isArray = Array.isArray();
  foo(isArray); // PS isArray=FALSE

  isArray = Array.isArray(null);
  foo(isArray); // PS isArray=FALSE

  isArray = Array.isArray([1, 2]);
  foo(isArray); // PS isArray=TRUE

  isArray = Array.isArray(new Array());
  foo(isArray); // PS isArray=TRUE

  foo(isArray);

}
