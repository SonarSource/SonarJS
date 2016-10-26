function main() {
  foo(); // PS arguments=OBJECT

  var b = Boolean, n = Number, s = String, f = Function;
  foo(); // PS b=FUNCTION & n=FUNCTION & s=FUNCTION & f=FUNCTION

  var objB = new Boolean();
  foo(); // PS objB=BOOLEAN

  var date = new Date();
  foo(); // PS date=DATE
}
