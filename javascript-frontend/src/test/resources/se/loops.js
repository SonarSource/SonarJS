function main(obj, arr) {

  for (var prop of obj) {
    bar(); // PS prop=UNKNOWN
  }

  var element = null; // PS element=NULL
  for (element in arr) {
   bar(); // PS element=UNKNOWN
  }

  var x = null, y;
  for (var key in x) {
    y = 42;
  }
  foo(); // PS y=UNDEFINED

  dummyStatement();
}
