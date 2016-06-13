function main() {

  var x, y, z, untracked;

  x = 0;  // PS x=FALSY
  x += 1; // PS x=UNKNOWN
  y = 5;  // PS y=TRUTHY
  z = 0;  // PS z=FALSY
  z++;    // PS z=UNKNOWN
  untracked = 5; // PS !untracked
  x = 0;
  x = foo[ y++ ]; // PS x=UNKNOWN & y=UNKNOWN
  
  function nested() {
    untracked = 42;
  }
}
