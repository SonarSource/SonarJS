function main() {

  var x, y, z, untracked;

  x = 0;  // PS x=ZERO
  x += 1; // PS x=UNKNOWN
  y = 5;  // PS y=TRUTHY_NUMBER
  z = 0;  // PS z=ZERO
  z++;    // PS z=UNKNOWN
  untracked = 5; // PS !untracked
  x = 0;
  x = foo[ y++ ]; // PS x=UNKNOWN & y=UNKNOWN
  
  function nested() {
    untracked = 42;
  }
}
