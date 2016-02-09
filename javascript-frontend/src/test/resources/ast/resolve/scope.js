/**
 * GLOBAL SCOPE: a, b, f
 */
var a;
b = 1; // implicit declaration - global scope
const const1 = 1;
let let1 = 1;

while (true) {
}

/**
 *  FUNCTION SCOPE: p, a, b
 */
function f (p) {
  var a;
  c = 1;  // implicit declaration - global scope

  /**
   *  FUNCTION SCOPE: g, a, x
   */
  var b = function g() {
    var x;
    var a;
    var x;
  }

  for (let let3 of b) {
    const const1 = 1;
    const const2 = 1;
    let let2 = 1;
    var notBlock = 1;
  }

  for (let let4 in b) {
  }

  for (let let5 = 1; let5 < 10; let5++) {
  }

  if (true) {
    let let6 = 1;
  } else {
    let let7 = 1;
  }

  switch (a) {
    case 1:
      let let8 = 1;
  }

}

/**
 *  CATCH SCOPE: e, a
 */
try {

} catch (e) {
  var a;
}

class A {
  f(){
  }
}
