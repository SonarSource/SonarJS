function main(array, i) {

  var x = array[i];
  x++; // PS array = NOT_NULLY

  var y = 0;
  if(i) {
    var undefinedArray;
    undefinedArray[i]; // We stop executing here
    y = 1; // This never happens because this branch was killed in the line above
  }
  y; // PS y = ZERO

}