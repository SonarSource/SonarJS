function main(obj, arr) {

  for (var prop of obj) {
    bar(); // PS prop=ANY_VALUE
  }

  var element = null; // PS element=NULL
  for (element in arr) {
   bar(); // PS element=ANY_VALUE
  }

  var x = null, y;
  for (var key in x) {
    y = 42;
  }
  foo(); // PS y=UNDEFINED

  makeLive(y);
}
