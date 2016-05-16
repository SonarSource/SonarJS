function main(obj, arr) {

  for (var prop of obj) {
    bar(); // PS prop=UNKNOWN
  }

  var element = null; // PS element=NULL

  dummyStatement();

  for (element in arr) {
   bar(); // PS element=UNKNOWN
  }
}
