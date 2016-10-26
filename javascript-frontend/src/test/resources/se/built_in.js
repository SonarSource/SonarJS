function main() {
  foo(); // PS arguments=OBJECT

  var b = Boolean, n = Number, s = String, f = Function;
  foo(); // PS b=FUNCTION & n=FUNCTION & s=FUNCTION & f=FUNCTION

  var objB = new Boolean();
  foo(); // PS objB=BOOLEAN

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

  var maxNum = Number.MAX_VALUE;
  foo(); // PS maxNum=TRUTHY_NUMBER
}
