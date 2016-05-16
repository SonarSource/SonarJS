function main() {

  var x, y, z, untracked;

  x += 1; // PS x=UNKNOWN
  y = 5;  // PS y=TRUTHY
  z++;    // PS z=UNKNOWN
  untracked = 5; // PS !untracked

  function nested() {
    untracked = 42;
  }
}
