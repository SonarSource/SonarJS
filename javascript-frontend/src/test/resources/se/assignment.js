function main() {

  var x, y, z, untracked, nan, undef;

  x = 0;  // PS x=ZERO
  x += 1; // PS x=NUMBER
  y = 5;  // PS y=POS_NUMBER
  z = 0;  // PS z=ZERO
  z++;    // PS z=POS_NUMBER
  undef = undefined; // PS undef=UNDEFINED
  nan = NaN; // PS nan=NAN
  untracked = 5; // PS !untracked
  x = 0;
  x = foo[ y++ ]; // PS x=ANY_VALUE & y=POS_NUMBER

  function nested() {
    untracked = 42;
  }


  // Array destructuring

  x = 10;
  [x] = foo();              // PS x=ANY_VALUE
  
  var z = 10;               // PS z=POS_NUMBER
  [z = "hello"] = foo();    // PS z=ANY_VALUE

  var [x1, y1] = foo();     // PS x1=ANY_VALUE & y1=ANY_VALUE

  var x2 = [1, 2];          // PS x2=ARRAY
  var y2 = "aaa";           // PS y2=TRUTHY_STRING
  [x2, y2] = foo();         // PS x2=ANY_VALUE & y2=ANY_VALUE

  x = [1, 2];
  [x[0], y] = foo();        // PS x=ARRAY & y=ANY_VALUE

  var a, e;
  a = 0;                           // PS a=ZERO & e=UNDEFINED
  [a, , , , e] = foo();            // PS a=ANY_VALUE & e=ANY_VALUE

  var [a1, b1, ...rest1] = foo();  // PS a1=ANY_VALUE & b1=ANY_VALUE & rest1=ANY_VALUE

  var a2, b2, rest2;
  a2 = b2 = rest2 = 0;
  [a2, b2, ...rest2] = foo();      // PS a2=ANY_VALUE & b2=ANY_VALUE & rest2=ANY_VALUE


  // Object destructuring

  var p, q;
  p = "aaa";
  q = null;                        // PS p=TRUTHY_STRING & q=NULL
  ({p, q} = {p:10, q:20});         // PS p=ANY_VALUE & q=ANY_VALUE

  var {prop1:r, prop2:s} = foo();  // PS r=ANY_VALUE & s=ANY_VALUE

  var v = 0;                       // PS v=ZERO
  ({prop1:v} = foo());             // PS v=ANY_VALUE

  var w = 10;                      // PS w=POS_NUMBER
  ({prop1:w = "hello"} = foo());   // PS w=ANY_VALUE
}
