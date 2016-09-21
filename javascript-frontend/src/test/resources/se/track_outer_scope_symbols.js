var globalVar = 42;
var globalDead = 42;

function outer(p) {

  var outerVar=42;
  p = 42;

  function main(par) {

    if (outerVar && globalVar) {

      foo(); // PS globalVar=TRUTHY & outerVar=TRUTHY & outer=FUNCTION & main=FUNCTION & !p & !globalDead

      makeLive(globalVar, outerVar, outer, main, p, par);
    }
  }

}
