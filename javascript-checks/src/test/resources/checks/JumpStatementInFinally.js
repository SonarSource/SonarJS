function nok() {
  try {
    return 1;
  } catch(err) {
    return 2;
  } finally {
//S ^^^^^^^ 1
    return 3; // Noncompliant [[id=1]] {{Remove this "return" statement from this "finally" block.}}
//  ^^^^^^
  }
}

function foo() {
  try { } finally {
    (function () {
      try { } finally {
//S           ^^^^^^^ 2
         return;  // Noncompliant [[id=2]]
//       ^^^^^^
      }})();

  }
}

while (true) {
  continue;
}

return;
break;
continue;
throw err;

// COMPLIANT
var foo = function() { try { return 1; } catch(err) { return 2; } finally { console.log('hola!') } }
var foo = function() { try { return 1; } catch(err) { return 2; } finally { try {} catch (e) { throw new Error() } } }
var foo = function() { try { return 1 } catch(err) { return 2 } finally { console.log('hola!') } }
var foo = function() { try { return 1 } catch(err) { return 2 } finally { function a(x) { return x } } }
var foo = function() { try { return 1 } catch(err) { return 2 } finally { var a = function(x) { if(!x) { throw new Error() } } } }
var foo = function() { try { return 1 } catch(err) { return 2 } finally { var a = function(x) { while(true) { if(x) { break } else { continue } } } } }
var foo = function() { try { return 1 } catch(err) { return 2 } finally { var a = function(x) { label: while(true) { if(x) { break label; } else { continue } } } } }
var foo = function() { try {} finally { while (true) break; } }
var foo = function() { try {} finally { while (true) continue; } }
var foo = function() { try {} finally { switch (true) { case true: break; } } }
var foo = function() { try {} finally { do { break; } while (true) } }
var foo = function() { try { return 1; } catch(err) { return 2; } finally { var bar = () => { throw new Error(); }; } };
var foo = function() { try { return 1; } catch(err) { return 2 } finally { (x) => x } }
var foo = function() { try { return 1; } finally { class bar { constructor() {} static ehm() { return 'Hola!'; } } } };


var foo = function() { try { return 1; } catch(err) { return 2; } finally { return 3; } } // Noncompliant
// Noncompliant@+1
var foo = function() { try { return 1 } catch(err) { return 2 } finally { if(true) { return 3 } else { return 2 } } } // Noncompliant
var foo = function() { try { return 1 } catch(err) { return 2 } finally { return 3 } } // Noncompliant
var foo = function() { try { return 1 } catch(err) { return 2 } finally { return function(x) { return y } } } // Noncompliant
var foo = function() { try { return 1 } catch(err) { return 2 } finally { return { x: function(c) { return c } } } } // Noncompliant
var foo = function() { try { return 1 } catch(err) { return 2 } finally { throw new Error() } } // Noncompliant
var foo = function() { try { foo(); } finally { try { bar(); } finally { return; } } }; // Noncompliant
var foo = function() { label: try { return 0; } finally { break label; } return 1; } // Noncompliant
var foo = function() { a: try { return 1; } catch(err) { return 2; } finally { break a; } } // Noncompliant
var foo = function() { while (true) try {} finally { break; } } // Noncompliant
var foo = function() { while (true) try {} finally { continue; } } // Noncompliant
var foo = function() { switch (true) { case true: try {} finally { break; } } } // Noncompliant
var foo = function() { a: while (true) try {} finally { switch (true) { case true: break a; } } } // Noncompliant
var foo = function() { a: while (true) try {} finally { switch (true) { case true: continue; } } } // Noncompliant
var foo = function() { a: switch (true) { case true: try {} finally { switch (true) { case true: break a; } } } } // Noncompliant
var foo = function() { a: switch (true) { case true: try {} finally { switch (true) { case true: break a; } } } } // Noncompliant
var foo = function() { a: while (true) try {} finally { switch (true) { case true: break a; } } } // Noncompliant
var foo = function() { a: while (true) try {} finally { switch (true) { case true: continue; } } } // Noncompliant
